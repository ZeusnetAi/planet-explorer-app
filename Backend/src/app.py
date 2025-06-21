from flask import Flask
from flask_cors import CORS
from flask_caching import Cache
from .config import Config

app = Flask(__name__, static_folder='static', static_url_path='')
app.config.from_object(Config)

CORS(app, resources={r"/api/*": {"origins": "*"}})
cache = Cache(app) 