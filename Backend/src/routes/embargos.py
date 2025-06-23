from flask import Blueprint, send_file, abort
import os

embargos_bp = Blueprint('embargos_bp', __name__)

@embargos_bp.route('/embargos', methods=['GET'])
def get_embargos():
    geojson_path = os.path.join(os.path.dirname(__file__), '../static/embargos.geojson')
    if not os.path.exists(geojson_path):
        abort(404, description='Arquivo de embargos não encontrado.')
    return send_file(geojson_path, mimetype='application/json') 