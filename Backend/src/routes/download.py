import os
import tempfile
import shutil
import logging
from flask import Blueprint, request, jsonify, send_file, current_app
from src.utils.errors import APIError, NotFoundError, ValidationError
from src.utils.planet_api import get_planet_client

download_bp = Blueprint('download', __name__)
logger = logging.getLogger(__name__)

@download_bp.route('/activate/<item_type>/<item_id>/<asset_type>', methods=['POST'])
def activate_asset(item_type, item_id, asset_type):
    """Ativa um asset para download"""
    try:
        if not item_type or not item_id or not asset_type:
            raise ValidationError("item_type, item_id e asset_type são obrigatórios")
        
        client = get_planet_client()
        
        # Obter informações do asset
        assets = client.get_item_assets(item_type, item_id)
        
        if asset_type not in assets:
            raise NotFoundError(f"Tipo de asset {asset_type} não disponível")
        
        asset = assets[asset_type]
        
        # Verificar se já está ativo
        if asset['status'] == 'active':
            return jsonify({
                'status': 'active',
                'download_url': asset.get('location'),
                'message': 'Asset já está ativo'
            })
        
        # Ativar o asset
        result = client.activate_asset(item_type, item_id, asset_type)
        
        logger.info(f"Asset activation initiated for {item_type}/{item_id}/{asset_type}")
        
        return jsonify({
            'status': 'activating',
            'message': 'Ativação do asset iniciada. Verifique o status em alguns momentos.',
            'result': result
        })
        
    except ValidationError as e:
        logger.warning(f"Validation error in asset activation: {str(e)}")
        return jsonify(e.to_dict()), e.status_code
    except APIError as e:
        logger.error(f"Error activating asset {item_type}/{item_id}/{asset_type}: {str(e)}")
        return jsonify({'error': str(e)}), e.status_code
    except Exception as e:
        logger.error(f"Unexpected error activating asset: {str(e)}")
        return jsonify({'error': 'Erro interno do servidor'}), 500

@download_bp.route('/status/<item_type>/<item_id>/<asset_type>', methods=['GET'])
def check_asset_status(item_type, item_id, asset_type):
    """Verifica status de ativação de um asset e tenta reativar se inativo."""
    try:
        if not item_type or not item_id or not asset_type:
            raise ValidationError("item_type, item_id e asset_type são obrigatórios")
        
        client = get_planet_client()
        assets = client.get_item_assets(item_type, item_id)
        
        if asset_type not in assets:
            raise NotFoundError(f"Tipo de asset {asset_type} não disponível")
        
        asset = assets[asset_type]
        status = asset.get('status')
        
        # Se o asset estiver inativo, tenta reativá-lo
        if status == 'inactive':
            logger.info(f"Asset {item_type}/{item_id}/{asset_type} está inativo. Tentando reativar...")
            try:
                client.activate_asset(item_type, item_id, asset_type)
                status = 'activating' # Assume que a reativação foi iniciada
            except APIError as activation_error:
                logger.error(f"Falha ao tentar reativar asset inativo: {activation_error}")
                # Não repassa o erro, apenas informa o status original
                pass
        
        return jsonify({
            'status': status,
            'download_url': asset.get('location'),
            'expires_at': asset.get('expires_at'),
            'file_size': asset.get('file_size')
        })
        
    except ValidationError as e:
        logger.warning(f"Validation error in status check: {str(e)}")
        return jsonify(e.to_dict()), e.status_code
    except APIError as e:
        logger.error(f"Error checking status for {item_type}/{item_id}/{asset_type}: {str(e)}")
        return jsonify({'error': str(e)}), e.status_code
    except Exception as e:
        logger.error(f"Unexpected error checking status: {str(e)}")
        return jsonify({'error': 'Erro interno do servidor'}), 500

@download_bp.route('/download/<item_type>/<item_id>/<asset_type>', methods=['GET'])
def download_asset(item_type, item_id, asset_type):
    """Download de um asset ativado"""
    temp_file = None
    temp_dir = None
    
    try:
        if not item_type or not item_id or not asset_type:
            raise ValidationError("item_type, item_id e asset_type são obrigatórios")
        
        client = get_planet_client()
        
        # Verificar status do asset
        assets = client.get_item_assets(item_type, item_id)
        
        if asset_type not in assets:
            raise NotFoundError(f"Tipo de asset {asset_type} não disponível")
        
        asset = assets[asset_type]
        
        if asset['status'] != 'active':
            raise ValidationError("Asset não está ativo. Ative primeiro.")
        
        download_url = asset.get('location')
        if not download_url:
            raise ValidationError("URL de download não disponível")
        
        # Fazer download do arquivo
        response = client.download_asset(download_url)
        
        # Criar arquivo temporário
        temp_dir = tempfile.mkdtemp()
        filename = f"{item_id}_{asset_type}.tif"
        temp_file = os.path.join(temp_dir, filename)
        
        # Salvar arquivo
        with open(temp_file, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        logger.info(f"Asset downloaded successfully: {item_type}/{item_id}/{asset_type}")
        
        # Retornar arquivo
        return send_file(
            temp_file,
            as_attachment=True,
            download_name=filename,
            mimetype='image/tiff'
        )
        
    except ValidationError as e:
        logger.warning(f"Validation error in download: {str(e)}")
        return jsonify(e.to_dict()), e.status_code
    except APIError as e:
        logger.error(f"Error downloading asset {item_type}/{item_id}/{asset_type}: {str(e)}")
        return jsonify({'error': str(e)}), e.status_code
    except Exception as e:
        logger.error(f"Unexpected error in download: {str(e)}")
        return jsonify({'error': 'Erro interno do servidor'}), 500
    finally:
        # Limpar arquivos temporários
        if temp_file and os.path.exists(temp_file):
            try:
                os.remove(temp_file)
            except Exception as e:
                logger.warning(f"Failed to remove temp file {temp_file}: {str(e)}")
        
        if temp_dir and os.path.exists(temp_dir):
            try:
                shutil.rmtree(temp_dir)
            except Exception as e:
                logger.warning(f"Failed to remove temp dir {temp_dir}: {str(e)}")

@download_bp.route('/available-assets/<item_type>/<item_id>', methods=['GET'])
def get_available_assets(item_type, item_id):
    """Lista assets disponíveis para um item"""
    try:
        if not item_type or not item_id:
            raise ValidationError("item_type e item_id são obrigatórios")
        
        client = get_planet_client()
        assets = client.get_item_assets(item_type, item_id)
        
        # Formatar informações dos assets
        formatted_assets = []
        for asset_type, asset_info in assets.items():
            if asset_type.startswith('_'):  # Pular campos de metadados
                continue
                
            formatted_assets.append({
                'type': asset_type,
                'status': asset_info.get('status'),
                'expires_at': asset_info.get('expires_at'),
                'file_size': asset_info.get('file_size'),
                'md5_digest': asset_info.get('md5_digest'),
                'description': get_asset_description(asset_type)
            })
        
        return jsonify({'assets': formatted_assets})
        
    except ValidationError as e:
        logger.warning(f"Validation error in available assets: {str(e)}")
        return jsonify(e.to_dict()), e.status_code
    except APIError as e:
        logger.error(f"Error getting available assets for {item_type}/{item_id}: {str(e)}")
        return jsonify({'error': str(e)}), e.status_code
    except Exception as e:
        logger.error(f"Unexpected error getting available assets: {str(e)}")
        return jsonify({'error': 'Erro interno do servidor'}), 500

def get_asset_description(asset_type):
    """Obtém descrição amigável do tipo de asset"""
    descriptions = {
        'ortho_visual': 'Imagem visual RGB para visualização',
        'ortho_analytic_4b': 'Imagem analítica de 4 bandas para análise',
        'ortho_analytic_8b': 'Imagem analítica de 8 bandas completa',
        'ortho_analytic_4b_sr': 'Reflectância de superfície 4 bandas',
        'ortho_analytic_8b_sr': 'Reflectância de superfície 8 bandas',
        'ortho_udm2': 'Máscara de dados utilizáveis',
        'basic_analytic_4b': 'Imagem analítica básica 4 bandas',
        'basic_analytic_8b': 'Imagem analítica básica 8 bandas',
        'basic_udm2': 'Máscara básica de dados utilizáveis'
    }
    return descriptions.get(asset_type, f'Asset tipo {asset_type}')

