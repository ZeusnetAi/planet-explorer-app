import logging
from flask import Blueprint, jsonify, request
from src.models.user import User, db
from src.utils.validators import validate_user_data
from src.utils.errors import ValidationError, NotFoundError, APIError

user_bp = Blueprint('user', __name__)
logger = logging.getLogger(__name__)

@user_bp.route('/users', methods=['GET'])
def get_users():
    """Obtém lista de todos os usuários"""
    try:
        users = User.query.all()
        return jsonify([user.to_dict() for user in users])
    except Exception as e:
        logger.error(f"Error getting users: {str(e)}")
        return jsonify({'error': 'Erro interno do servidor'}), 500

@user_bp.route('/users', methods=['POST'])
def create_user():
    """Cria um novo usuário"""
    try:
        data = request.get_json()
        if not data:
            raise ValidationError("Dados do usuário são obrigatórios")
        
        # Validar dados do usuário
        validation = validate_user_data(data)
        if not validation['valid']:
            raise ValidationError("Dados do usuário inválidos", validation['errors'])
        
        # Verificar se usuário já existe
        existing_user = User.query.filter(
            (User.username == data['username']) | (User.email == data['email'])
        ).first()
        
        if existing_user:
            if existing_user.username == data['username']:
                raise ValidationError("Username já existe")
            else:
                raise ValidationError("Email já existe")
        
        # Criar novo usuário
        user = User(username=data['username'], email=data['email'])
        db.session.add(user)
        db.session.commit()
        
        logger.info(f"User created: {user.username}")
        return jsonify(user.to_dict()), 201
        
    except ValidationError as e:
        logger.warning(f"Validation error creating user: {str(e)}")
        return jsonify(e.to_dict()), e.status_code
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating user: {str(e)}")
        return jsonify({'error': 'Erro interno do servidor'}), 500

@user_bp.route('/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    """Obtém um usuário específico"""
    try:
        user = User.query.get(user_id)
        if not user:
            raise NotFoundError("Usuário não encontrado")
        
        return jsonify(user.to_dict())
        
    except NotFoundError as e:
        logger.warning(f"User not found: {user_id}")
        return jsonify(e.to_dict()), e.status_code
    except Exception as e:
        logger.error(f"Error getting user {user_id}: {str(e)}")
        return jsonify({'error': 'Erro interno do servidor'}), 500

@user_bp.route('/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    """Atualiza um usuário"""
    try:
        user = User.query.get(user_id)
        if not user:
            raise NotFoundError("Usuário não encontrado")
        
        data = request.get_json()
        if not data:
            raise ValidationError("Dados para atualização são obrigatórios")
        
        # Validar dados se fornecidos
        if 'username' in data or 'email' in data:
            validation_data = {
                'username': data.get('username', user.username),
                'email': data.get('email', user.email)
            }
            validation = validate_user_data(validation_data)
            if not validation['valid']:
                raise ValidationError("Dados inválidos", validation['errors'])
        
        # Verificar se novos dados já existem
        if 'username' in data and data['username'] != user.username:
            existing = User.query.filter_by(username=data['username']).first()
            if existing:
                raise ValidationError("Username já existe")
        
        if 'email' in data and data['email'] != user.email:
            existing = User.query.filter_by(email=data['email']).first()
            if existing:
                raise ValidationError("Email já existe")
        
        # Atualizar usuário
        user.username = data.get('username', user.username)
        user.email = data.get('email', user.email)
        db.session.commit()
        
        logger.info(f"User updated: {user.username}")
        return jsonify(user.to_dict())
        
    except (ValidationError, NotFoundError) as e:
        logger.warning(f"Error updating user {user_id}: {str(e)}")
        return jsonify(e.to_dict()), e.status_code
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating user {user_id}: {str(e)}")
        return jsonify({'error': 'Erro interno do servidor'}), 500

@user_bp.route('/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    """Remove um usuário"""
    try:
        user = User.query.get(user_id)
        if not user:
            raise NotFoundError("Usuário não encontrado")
        
        username = user.username
        db.session.delete(user)
        db.session.commit()
        
        logger.info(f"User deleted: {username}")
        return '', 204
        
    except NotFoundError as e:
        logger.warning(f"User not found for deletion: {user_id}")
        return jsonify(e.to_dict()), e.status_code
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting user {user_id}: {str(e)}")
        return jsonify({'error': 'Erro interno do servidor'}), 500
