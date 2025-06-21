import logging
from flask import Blueprint, request, jsonify
from src.utils.validators import validate_search_params
from src.utils.errors import ValidationError, APIError, QuotaError, RateLimitError
from src.utils.planet_api import get_planet_client, build_search_payload

planet_bp = Blueprint('planet', __name__)
logger = logging.getLogger(__name__)

@planet_bp.route('/item-types', methods=['GET'])
def get_item_types_route():
    try:
        client = get_planet_client()
        # A função get_item_types() agora retorna a lista diretamente
        item_types = client.get_item_types() 
        return jsonify({'item_types': item_types})
    except (APIError, QuotaError, RateLimitError) as e:
        logger.error(f"Erro na API da Planet ao buscar tipos de item: {e}")
        return jsonify({"error": str(e)}), e.status_code
    except Exception as e:
        logger.exception("Erro inesperado ao buscar tipos de item.")
        return jsonify({"error": "Ocorreu um erro interno inesperado."}), 500

@planet_bp.route('/search', methods=['POST'])
def search_items():
    """Busca itens na API da Planet baseado em filtros"""
    try:
        import sys
        print('Recebendo requisição de busca...', file=sys.stderr)
        search_data = request.get_json()
        if not search_data:
            raise ValidationError("Dados de busca são obrigatórios")
        
        print(f"Dados recebidos: {search_data}", file=sys.stderr)
        
        logger.info(f"Search request received: {search_data}")
        
        # Validar parâmetros de busca
        validation = validate_search_params(search_data)
        if not validation['valid']:
            raise ValidationError("Parâmetros de busca inválidos", validation['errors'])
        
        # Construir payload para a API da Planet
        search_payload = build_search_payload(search_data)
        logger.debug(f"Search payload: {search_payload}")
        
        # Fazer busca na API da Planet
        client = get_planet_client()
        features_list = client.search_items(search_payload)
        
        logger.info(f"Search completed. Found {len(features_list)} items after pagination.")
        
        # O frontend espera um objeto GeoJSON, então remontamos a estrutura
        return jsonify({
            'type': 'FeatureCollection',
            'features': features_list
        })
        
    except ValidationError as e:
        logger.warning(f"Validation error in search: {str(e)}")
        return jsonify(e.to_dict()), e.status_code
    except APIError as e:
        logger.error(f"Planet API error in search: {str(e)}")
        return jsonify({'error': str(e)}), e.status_code
    except Exception as e:
        logger.error(f"Unexpected error in search: {str(e)}")
        return jsonify({'error': 'Erro interno do servidor'}), 500

@planet_bp.route('/item/<item_type>/<item_id>/assets', methods=['GET'])
def get_item_assets(item_type, item_id):
    """Obtém assets de um item específico"""
    try:
        client = get_planet_client()
        result = client.get_item_assets(item_type, item_id)
        return jsonify(result)
    except APIError as e:
        logger.error(f"Error getting assets for {item_type}/{item_id}: {str(e)}")
        return jsonify({'error': str(e)}), e.status_code
    except Exception as e:
        logger.error(f"Unexpected error getting assets: {str(e)}")
        return jsonify({'error': 'Erro interno do servidor'}), 500

@planet_bp.route('/item/<item_type>/<item_id>/assets/<asset_type>/activate', methods=['POST'])
def activate_asset(item_type, item_id, asset_type):
    """Ativa um asset para download"""
    try:
        client = get_planet_client()
        result = client.activate_asset(item_type, item_id, asset_type)
        logger.info(f"Asset activation initiated for {item_type}/{item_id}/{asset_type}")
        return jsonify({'message': 'Ativação do asset iniciada', 'result': result})
    except APIError as e:
        logger.error(f"Error activating asset {item_type}/{item_id}/{asset_type}: {str(e)}")
        return jsonify({'error': str(e)}), e.status_code
    except Exception as e:
        logger.error(f"Unexpected error activating asset: {str(e)}")
        return jsonify({'error': 'Erro interno do servidor'}), 500

@planet_bp.route('/item/<item_type>/<item_id>/assets/<asset_type>/download', methods=['GET'])
def get_download_url(item_type, item_id, asset_type):
    """Obtém URL de download para um asset ativado"""
    try:
        client = get_planet_client()
        assets = client.get_item_assets(item_type, item_id)
        
        if asset_type not in assets:
            return jsonify({'error': 'Tipo de asset não encontrado'}), 404
        
        asset = assets[asset_type]
        if asset['status'] != 'active':
            return jsonify({
                'error': 'Asset não está ativado', 
                'status': asset['status']
            }), 400
        
        download_url = asset.get('location')
        if not download_url:
            return jsonify({'error': 'URL de download não disponível'}), 400
        
        return jsonify({'download_url': download_url})
        
    except APIError as e:
        logger.error(f"Error getting download URL for {item_type}/{item_id}/{asset_type}: {str(e)}")
        return jsonify({'error': str(e)}), e.status_code
    except Exception as e:
        logger.error(f"Unexpected error getting download URL: {str(e)}")
        return jsonify({'error': 'Erro interno do servidor'}), 500

@planet_bp.route('/thumbnail/<item_type>/<item_id>', methods=['GET'])
def get_thumbnail(item_type, item_id):
    """Obtém URL do thumbnail de um item"""
    try:
        client = get_planet_client()
        item_data = client.get_item_details(item_type, item_id)
        
        # Extrair URL do thumbnail dos links
        thumbnail_url = None
        if 'links' in item_data and 'thumbnail' in item_data['links']:
            thumbnail_url = item_data['links']['thumbnail']
        
        if not thumbnail_url:
            return jsonify({'error': 'Thumbnail não disponível'}), 404
        
        # Adicionar API key para autenticação
        separator = '&' if '?' in thumbnail_url else '?'
        thumbnail_url += f"{separator}api_key={client.api_key}"
        
        return jsonify({'thumbnail_url': thumbnail_url})
        
    except APIError as e:
        logger.error(f"Error getting thumbnail for {item_type}/{item_id}: {str(e)}")
        return jsonify({'error': str(e)}), e.status_code
    except Exception as e:
        logger.error(f"Unexpected error getting thumbnail: {str(e)}")
        return jsonify({'error': 'Erro interno do servidor'}), 500

@planet_bp.route('/stats', methods=['POST'])
def get_search_stats():
    """Obtém estatísticas para uma consulta de busca"""
    try:
        search_data = request.get_json()
        if not search_data:
            raise ValidationError("Dados de busca são obrigatórios")
        
        # Validar parâmetros
        validation = validate_search_params(search_data)
        if not validation['valid']:
            raise ValidationError("Parâmetros de busca inválidos", validation['errors'])
        
        # Construir payload para estatísticas
        stats_payload = {
            "item_types": search_data.get('item_types', ["PSScene"]),
            "interval": "day"
        }
        
        # Adicionar filtros se fornecidos
        if search_data.get('start_date') and search_data.get('end_date'):
            date_filter = {
                "type": "DateRangeFilter",
                "field_name": "acquired",
                "config": {
                    "gte": search_data['start_date'],
                    "lte": search_data['end_date']
                }
            }
            stats_payload["filter"] = date_filter
        
        if search_data.get('max_cloud_cover') is not None:
            cloud_filter = {
                "type": "RangeFilter",
                "field_name": "cloud_cover",
                "config": {
                    "gte": 0,
                    "lte": search_data['max_cloud_cover'] / 100.0
                }
            }
            stats_payload["filter"] = cloud_filter
        
        if search_data.get('geometry'):
            geometry_filter = {
                "type": "GeometryFilter",
                "field_name": "geometry",
                "config": search_data['geometry']
            }
            stats_payload["filter"] = geometry_filter
        
        client = get_planet_client()
        result = client.get_stats(stats_payload)
        
        return jsonify(result)
        
    except ValidationError as e:
        logger.warning(f"Validation error in stats: {str(e)}")
        return jsonify(e.to_dict()), e.status_code
    except APIError as e:
        logger.error(f"Planet API error in stats: {str(e)}")
        return jsonify({'error': str(e)}), e.status_code
    except Exception as e:
        logger.error(f"Unexpected error in stats: {str(e)}")
        return jsonify({'error': 'Erro interno do servidor'}), 500

