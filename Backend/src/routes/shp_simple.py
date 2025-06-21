import os
import tempfile
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
import zipfile
import json
import pyogrio

shp_bp = Blueprint('shp', __name__)

@shp_bp.route('/upload-shp', methods=['POST'])
def upload_shp():
    """
    Processa um arquivo .zip contendo um shapefile, ou um conjunto de arquivos .shp, .shx, .dbf, .prj.
    """
    if 'files' not in request.files:
        return jsonify({'error': 'Nenhum arquivo enviado'}), 400

    files = request.files.getlist('files')
    if not files or files[0].filename == '':
        return jsonify({'error': 'Nenhum arquivo selecionado'}), 400
    
    with tempfile.TemporaryDirectory() as temp_dir:
        shp_path = None
        
        # Salva todos os arquivos e procura por um .zip
        zip_file_path = None
        for file in files:
            filename = secure_filename(file.filename)
            file_path = os.path.join(temp_dir, filename)
            file.save(file_path)
            if filename.lower().endswith('.zip'):
                zip_file_path = file_path

        # Se um .zip foi encontrado, extrai ele
        if zip_file_path:
            with zipfile.ZipFile(zip_file_path, 'r') as zip_ref:
                zip_ref.extractall(temp_dir)
        
        # Procura por um arquivo .shp no diretório temporário (após possível extração)
        for filename in os.listdir(temp_dir):
            if filename.lower().endswith('.shp'):
                shp_path = os.path.join(temp_dir, filename)
                break

        if not shp_path:
            return jsonify({'error': 'Nenhum arquivo .shp encontrado nos arquivos enviados ou no .zip.'}), 400

        try:
            # Usa pyogrio para ler o shapefile e obter o GeoJSON
            gdf = pyogrio.read_dataframe(shp_path)
            
            if gdf.empty:
                return jsonify({'error': 'O shapefile está vazio ou não pôde ser lido.'}), 400

            # Converte para o CRS padrão (WGS84) se não for
            if gdf.crs and gdf.crs.to_string() != 'EPSG:4326':
                 gdf = gdf.to_crs("EPSG:4326")
            
            # Pega a união de todas as geometrias para garantir um único objeto
            geometry = gdf.unary_union
            
            # Converte a geometria para um formato de dicionário (similar a GeoJSON)
            geometry_json = json.loads(json.dumps(geometry.__geo_interface__))
            
            return jsonify({'geometry': geometry_json, 'message': 'Shapefile processado com sucesso!'})

        except Exception as e:
            return jsonify({'error': f'Erro ao processar o shapefile: {str(e)}'}), 500

