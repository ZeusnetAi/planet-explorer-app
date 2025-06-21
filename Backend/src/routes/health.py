from flask import Blueprint, jsonify
import os
import psutil

health_bp = Blueprint('health_bp', __name__)

@health_bp.route('/health', methods=['GET'])
def health_check():
    """Endpoint de health check para monitoramento."""
    try:
        # Verificar se a chave da API está configurada
        api_key = os.environ.get('PLANET_API_KEY')
        if not api_key:
            return jsonify({
                'status': 'error',
                'message': 'PLANET_API_KEY não configurada',
                'timestamp': None
            }), 500

        # Informações do sistema
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')

        return jsonify({
            'status': 'healthy',
            'timestamp': None,
            'system': {
                'cpu_percent': cpu_percent,
                'memory_percent': memory.percent,
                'disk_percent': disk.percent,
                'disk_free_gb': round(disk.free / (1024**3), 2)
            },
            'services': {
                'planet_api': 'configured' if api_key else 'not_configured'
            }
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e),
            'timestamp': None
        }), 500 