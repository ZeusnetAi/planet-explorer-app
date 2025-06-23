# Importação padrão do Flask, conforme outros arquivos do projeto
from flask import Blueprint, request, Response, jsonify
import requests

wfs_proxy = Blueprint('wfs_proxy', __name__)

@wfs_proxy.route('/proxy-wfs', methods=['GET'])
def proxy_wfs():
    url = request.args.get('url')
    if not url:
        return jsonify({'error': 'URL obrigatória'}), 400
    try:
        resp = requests.get(url)
        headers = dict(resp.headers)
        # Remove headers problemáticos
        headers.pop('Content-Encoding', None)
        headers.pop('Content-Length', None)
        # Garante que o frontend sempre receba CORS liberado
        headers['Access-Control-Allow-Origin'] = '*'
        return Response(resp.content, status=resp.status_code, headers=headers)
    except Exception as e:
        return jsonify({'error': str(e)}), 500 