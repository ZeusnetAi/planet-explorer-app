import os
from datetime import timedelta

class Config:
    """Configuração base da aplicação"""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///app.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Planet API Configuration
    PLANET_API_KEY = os.environ.get('PLANET_API_KEY')
    PLANET_BASE_URL = 'https://api.planet.com/data/v1'
    
    # Upload Configuration
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
    ALLOWED_EXTENSIONS = {'shp', 'shx', 'dbf', 'prj', 'zip'}
    
    # Cache Configuration - Otimizado para performance
    CACHE_TYPE = 'simple'
    CACHE_DEFAULT_TIMEOUT = 600  # 10 minutos
    CACHE_KEY_PREFIX = 'planet_api_'
    
    # Performance Configuration
    JSON_SORT_KEYS = False  # Melhora performance do JSON
    JSONIFY_PRETTYPRINT_REGULAR = False  # Reduz overhead do JSON
    
    # Logging Configuration
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
    
    @staticmethod
    def init_app(app):
        pass

class DevelopmentConfig(Config):
    """Configuração para desenvolvimento"""
    DEBUG = True
    LOG_LEVEL = 'DEBUG'
    CACHE_DEFAULT_TIMEOUT = 60  # 1 minuto em desenvolvimento

class ProductionConfig(Config):
    """Configuração para produção"""
    DEBUG = False
    CACHE_DEFAULT_TIMEOUT = 1800  # 30 minutos em produção
    
    @classmethod
    def init_app(cls, app):
        Config.init_app(app)
        
        # Log para stderr em produção
        import logging
        from logging import StreamHandler
        file_handler = StreamHandler()
        file_handler.setLevel(logging.INFO)
        app.logger.addHandler(file_handler)

class TestingConfig(Config):
    """Configuração para testes"""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
} 