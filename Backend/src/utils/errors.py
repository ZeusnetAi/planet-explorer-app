from flask import jsonify
from werkzeug.http import HTTP_STATUS_CODES

class APIError(Exception):
    """Classe base para erros da API"""
    def __init__(self, message, status_code=500):
        super().__init__(message)
        self.status_code = status_code
        self.message = message

    def to_dict(self):
        return {'error': self.message}

class ValidationError(APIError):
    """Erro de validação"""
    def __init__(self, message="Erro de validação nos dados fornecidos.", status_code=400):
        super().__init__(message, status_code)

class NotFoundError(APIError):
    """Erro de recurso não encontrado"""
    def __init__(self, message="Recurso não encontrado"):
        super().__init__(message, status_code=404)

class UnauthorizedError(APIError):
    """Erro de não autorizado"""
    def __init__(self, message="Não autorizado"):
        super().__init__(message, status_code=401)

class ForbiddenError(APIError):
    """Erro de acesso negado"""
    def __init__(self, message="Acesso negado"):
        super().__init__(message, status_code=403)

class InternalServerError(APIError):
    """Erro interno do servidor"""
    def __init__(self, message="Erro interno do servidor"):
        super().__init__(message, status_code=500)

class QuotaError(APIError):
    """Exceção para erros de cota excedida (HTTP 403)."""
    def __init__(self, message="Cota de busca ou download da API da Planet excedida.", status_code=403):
        super().__init__(message, status_code)

class RateLimitError(APIError):
    """Exceção para erros de limite de requisições (HTTP 429)."""
    def __init__(self, message="Limite de requisições à API da Planet excedido. Tente novamente mais tarde.", status_code=429):
        super().__init__(message, status_code)

def error_response(status_code, message=None):
    """Cria resposta de erro padronizada"""
    payload = {'error': message}
    if message is None:
        payload['error'] = HTTP_STATUS_CODES.get(status_code, 'Unknown error')
    response = jsonify(payload)
    response.status_code = status_code
    return response

def bad_request(message):
    """Resposta de erro 400"""
    return error_response(400, message)

def unauthorized(message="Não autorizado"):
    """Resposta de erro 401"""
    return error_response(401, message)

def forbidden(message="Acesso negado"):
    """Resposta de erro 403"""
    return error_response(403, message)

def not_found(message="Recurso não encontrado"):
    """Resposta de erro 404"""
    return error_response(404, message)

def internal_error(message="Erro interno do servidor"):
    """Resposta de erro 500"""
    return error_response(500, message)

# --- Adicionando Handlers para o Flask ---

def handle_api_error(error):
    """Handler para a classe APIError"""
    response = jsonify(error.to_dict())
    response.status_code = error.status_code
    return response

def handle_validation_error(error):
    """Handler para a classe ValidationError"""
    response = jsonify(error.to_dict())
    response.status_code = error.status_code
    return response

def handle_not_found(error):
    """Handler para a classe NotFoundError"""
    # Para o erro 404, podemos usar um formato mais simples
    # ou o formato padrão da APIError, se preferir.
    response = jsonify({
        "error": "Recurso não encontrado",
        "message": str(error),
        "status_code": 404
    })
    response.status_code = 404
    return response

def handle_internal_server_error(error):
    """Handler para erros 500 genéricos"""
    # Logar o erro é uma boa prática aqui
    # import logging
    # logging.exception('Internal Server Error')
    response = jsonify({
        "error": "Erro interno do servidor",
        "message": "Ocorreu um problema inesperado.",
        "status_code": 500
    })
    response.status_code = 500
    return response 