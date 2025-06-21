import logging
import requests
from flask import Blueprint, request, jsonify, Response, stream_with_context
from src.utils.planet_api import get_planet_client, APIError
from src.utils.errors import handle_api_error
import rasterio
from PIL import Image
import numpy as np
import io
from src.app import cache

basemap_bp = Blueprint('basemap_bp', __name__)
logger = logging.getLogger(__name__)

@basemap_bp.route('/series', methods=['GET'])
def get_series_route():
    """Lista todas as séries de basemaps disponíveis para a chave de API."""
    try:
        client = get_planet_client()
        # Corrige a chamada para o novo nome do método
        series_data = client.get_series()
        return jsonify(series_data)
    except APIError as e:
        logger.error(f"Erro na API da Planet ao listar séries: {e}")
        return jsonify(e.to_dict()), e.status_code
    except Exception as e:
        logger.error(f"Erro inesperado ao listar séries: {e}", exc_info=True)
        return jsonify({'error': 'Erro interno do servidor'}), 500

@basemap_bp.route('/mosaics', methods=['GET'])
def get_mosaics_route():
    series_id = request.args.get('series_id')
    year = request.args.get('year')
    month = request.args.get('month')

    # Se year ou month não forem fornecidos, é a chamada antiga e quebrada do frontend.
    # Retornamos uma resposta vazia com sucesso para não quebrar a interface.
    if not year or not month:
        return jsonify({"mosaics": []})

    if not series_id:
        return jsonify({"error": "series_id é obrigatório"}), 400
    
    try:
        mosaic_id = get_mosaic_id_from_cache_or_api(series_id, year, month)
        if not mosaic_id:
            return jsonify({"error": "Nenhum mosaico encontrado para a data e série selecionadas."}), 404
            
        return jsonify({"mosaic_id": mosaic_id})
    except Exception as e:
        return handle_api_error(e)

def get_mosaic_id_from_cache_or_api(series_id, year, month):
    cache_key = f"mosaic_{series_id}_{year}_{month}"
    cached_mosaic = cache.get(cache_key)
    if cached_mosaic:
        logging.info(f"Cache HIT para a chave: {cache_key}")
        return cached_mosaic

    logging.info(f"Cache MISS para a chave: {cache_key}. Buscando na API.")
    client = get_planet_client()
    mosaics = client.get_mosaics_for_series(series_id)
    
    target_name_part = f"{year}-{str(month).zfill(2)}"
    
    for mosaic in mosaics.get('mosaics', []):
        if target_name_part in mosaic['name']:
            mosaic_id = mosaic['id']
            logging.info(f"Mosaico encontrado: {mosaic['name']} com ID: {mosaic_id}. Armazenando no cache.")
            cache.set(cache_key, mosaic_id, timeout=3600) # Cache por 1 hora
            return mosaic_id
            
    logging.warning(f"Nenhum mosaico encontrado para {series_id} em {year}-{month}")
    return None

@basemap_bp.route('/quads', methods=['POST'])
def search_quads_route():
    data = request.json
    mosaic_id = data.get('mosaic_id')
    geometry = data.get('geometry')
    series_id = data.get('series_id')

    if not all([mosaic_id, geometry, series_id]):
        return jsonify({"error": "mosaic_id, geometry e series_id são obrigatórios"}), 400

    try:
        client = get_planet_client()
        quads = client.get_quads_for_mosaic(mosaic_id, geometry)

        # Adiciona os dados necessários para o frontend
        for quad in quads:
            quad['mosaic_id'] = mosaic_id
            quad['series_id'] = series_id
            quad['type'] = 'basemap_quad'

        logging.info(f"Busca de quads concluída. Total de {len(quads)} quads encontrados.")
        return jsonify(quads)
    except Exception as e:
        return handle_api_error(e)

@basemap_bp.route('/quad/<mosaic_id>/<quad_id>', methods=['GET'])
def get_quad_details_route(mosaic_id, quad_id):
    """Busca os detalhes completos de um único quad para obter o link dos tiles."""
    try:
        client = get_planet_client()
        quad_details = client.get_quad_details(mosaic_id, quad_id)
        return jsonify(quad_details)
    except Exception as e:
        return handle_api_error(e)

@basemap_bp.route('/quad/preview', methods=['GET'])
def preview_quad():
    """
    Busca a imagem de um quad, converte para PNG e a transmite como resposta.
    Implementa cache manual para evitar problemas com o memoize em view functions.
    """
    mosaic_id = request.args.get('mosaic_id')
    quad_id = request.args.get('quad_id')

    if not mosaic_id or not quad_id:
        return jsonify({'error': 'Os parâmetros mosaic_id e quad_id são obrigatórios'}), 400

    cache_key = f"quad_preview_{mosaic_id}_{quad_id}"
    cached_png = cache.get(cache_key)
    if cached_png:
        logger.info(f"Cache HIT para a chave: {cache_key}")
        return Response(cached_png, mimetype='image/png')

    logger.info(f"Cache MISS para a chave: {cache_key}. Gerando imagem.")

    try:
        client = get_planet_client()
        session = client.session

        quad_info_url = f"{client.base_url}/basemaps/v1/mosaics/{mosaic_id}/quads/{quad_id}"
        res = session.get(quad_info_url)
        res.raise_for_status()
        download_url = res.json()['_links'].get('download')

        if not download_url:
            return jsonify({'error': 'Link para download não encontrado.'}), 404

        image_res = requests.get(download_url, auth=session.auth, stream=True)
        image_res.raise_for_status()
        
        # Lê o conteúdo do TIFF em memória
        tiff_bytes = image_res.content

        with rasterio.open(io.BytesIO(tiff_bytes)) as src:
            # Lê as 3 primeiras bandas (RGB) e ignora a quarta (Alpha/NIR) se existir
            r, g, b = src.read((1, 2, 3))

            # Função melhorada de normalização com ajuste de brilho e contraste
            def enhance_band(band):
                # Remove outliers extremos (1% e 99% percentis)
                p1, p99 = np.percentile(band, [1, 99])
                band_clipped = np.clip(band, p1, p99)
                
                # Normaliza para 0-255
                band_min, band_max = band_clipped.min(), band_clipped.max()
                if band_max == band_min:
                    return np.zeros(band.shape, dtype=np.uint8)
                
                # Aplica uma curva de correção gamma para melhorar o contraste
                normalized = ((band_clipped - band_min) / (band_max - band_min))
                
                # Aplica correção gamma (1.2 para deixar mais claro)
                gamma = 1.2
                corrected = np.power(normalized, 1/gamma)
                
                # Aumenta o brilho geral
                brightness_boost = 1.1
                corrected = np.clip(corrected * brightness_boost, 0, 1)
                
                return (corrected * 255).astype(np.uint8)

            r_enhanced = enhance_band(r)
            g_enhanced = enhance_band(g)
            b_enhanced = enhance_band(b)

            # Empilha as bandas para formar uma imagem RGB
            rgb = np.dstack((r_enhanced, g_enhanced, b_enhanced))

        # Converte o array numpy para uma imagem do Pillow
        img = Image.fromarray(rgb, 'RGB')
        
        # Aplica ajustes adicionais na imagem final
        from PIL import ImageEnhance
        
        # Aumenta o contraste
        contrast_enhancer = ImageEnhance.Contrast(img)
        img = contrast_enhancer.enhance(1.3)
        
        # Aumenta ligeiramente o brilho
        brightness_enhancer = ImageEnhance.Brightness(img)
        img = brightness_enhancer.enhance(1.1)
        
        # Aumenta a saturação para cores mais vibrantes
        saturation_enhancer = ImageEnhance.Color(img)
        img = saturation_enhancer.enhance(1.2)
        
        # Salva a imagem como PNG em um buffer de bytes
        png_buffer = io.BytesIO()
        img.save(png_buffer, format='PNG', optimize=True)
        png_buffer.seek(0)
        
        png_bytes = png_buffer.getvalue()
        cache.set(cache_key, png_bytes, timeout=3600)

        return Response(png_bytes, mimetype='image/png')

    except requests.exceptions.HTTPError as e:
        logger.error(f"Erro HTTP ao buscar preview do quad {quad_id}: {e.response.text}")
        return jsonify({'error': f'Erro ao comunicar com a API da Planet: {e.response.status_code}'}), e.response.status_code
    except Exception as e:
        logger.error(f"Erro inesperado ao buscar/converter preview do quad: {e}", exc_info=True)
        return jsonify({'error': 'Erro interno do servidor'}), 500 