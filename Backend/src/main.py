import os
import logging
from dotenv import load_dotenv

# Carrega as variáveis de ambiente do arquivo .env
load_dotenv()

# Configuração de logging
log_dir = 'logs'
if not os.path.exists(log_dir):
    os.makedirs(log_dir)

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(log_dir, 'app.log')),
        logging.StreamHandler()
    ]
)

from src.app import app, cache
from src.routes.basemap import basemap_bp
from src.routes.planet import planet_bp
from src.routes.download import download_bp
from src.routes.shp_simple import shp_bp
from src.utils.errors import handle_api_error, handle_validation_error, handle_not_found, handle_internal_server_error
from src.utils.errors import APIError, ValidationError, QuotaError, RateLimitError
from werkzeug.exceptions import NotFound

# Registrar Blueprints
app.register_blueprint(basemap_bp, url_prefix='/api/basemap')
app.register_blueprint(planet_bp, url_prefix='/api/planet')
app.register_blueprint(download_bp, url_prefix='/api/download')
app.register_blueprint(shp_bp, url_prefix='/api/shp')

# Registrar manipuladores de erro
app.register_error_handler(APIError, handle_api_error)
app.register_error_handler(ValidationError, handle_validation_error)
app.register_error_handler(QuotaError, handle_api_error)
app.register_error_handler(RateLimitError, handle_api_error)
app.register_error_handler(NotFound, handle_not_found)
app.register_error_handler(Exception, handle_internal_server_error)


@app.route('/')
def index():
    return app.send_static_file('index.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
