import re
from datetime import datetime
from typing import Dict, Any, Optional, List

def validate_email(email: str) -> bool:
    """Valida formato de email"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))

def validate_date_format(date_str: str) -> bool:
    """Valida formato de data YYYY-MM-DD"""
    try:
        datetime.strptime(date_str, '%Y-%m-%d')
        return True
    except ValueError:
        return False

def validate_date_range(start_date: str, end_date: str) -> bool:
    """Valida se a data de início é anterior à data de fim"""
    try:
        start = datetime.strptime(start_date, '%Y-%m-%d')
        end = datetime.strptime(end_date, '%Y-%m-%d')
        return start <= end
    except ValueError:
        return False

def validate_cloud_cover(cloud_cover: float) -> bool:
    """Valida cobertura de nuvens (0-100)"""
    return 0 <= cloud_cover <= 100

def validate_geometry(geometry: Dict[str, Any]) -> bool:
    """Valida estrutura básica de geometria GeoJSON"""
    if not isinstance(geometry, dict):
        return False
    
    if 'type' not in geometry or 'coordinates' not in geometry:
        return False
    
    valid_types = ['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon']
    if geometry['type'] not in valid_types:
        return False
    
    if not isinstance(geometry['coordinates'], list):
        return False
    
    return True

def validate_search_params(data: Dict[str, Any]) -> Dict[str, Any]:
    """Valida parâmetros de busca"""
    errors = []
    
    # Validar datas
    if data.get('startDate') and not validate_date_format(data['startDate']):
        errors.append('startDate deve estar no formato YYYY-MM-DD')
    
    if data.get('endDate') and not validate_date_format(data['endDate']):
        errors.append('endDate deve estar no formato YYYY-MM-DD')
    
    if data.get('startDate') and data.get('endDate'):
        if not validate_date_range(data['startDate'], data['endDate']):
            errors.append('startDate deve ser anterior ou igual a endDate')
    
    # Validar cobertura de nuvens
    if data.get('maxCloudCover') is not None:
        try:
            cloud_cover = float(data['maxCloudCover'])
            if not validate_cloud_cover(cloud_cover):
                errors.append('maxCloudCover deve estar entre 0 e 100')
        except (ValueError, TypeError):
            errors.append('maxCloudCover deve ser um número válido')
    
    # Validar geometria
    if data.get('geometry') and not validate_geometry(data['geometry']):
        errors.append('geometry deve ser um objeto GeoJSON válido')
    
    # Validar tipos de item
    if data.get('itemTypes'):
        if not isinstance(data['itemTypes'], list):
            errors.append('itemTypes deve ser uma lista')
        elif not all(isinstance(item, str) for item in data['itemTypes']):
            errors.append('itemTypes deve conter apenas strings')
    
    return {'valid': len(errors) == 0, 'errors': errors}

def validate_user_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """Valida dados de usuário"""
    errors = []
    
    # Validar username
    if not data.get('username'):
        errors.append('username é obrigatório')
    elif len(data['username']) < 3:
        errors.append('username deve ter pelo menos 3 caracteres')
    elif len(data['username']) > 80:
        errors.append('username deve ter no máximo 80 caracteres')
    
    # Validar email
    if not data.get('email'):
        errors.append('email é obrigatório')
    elif not validate_email(data['email']):
        errors.append('email deve ter formato válido')
    
    return {'valid': len(errors) == 0, 'errors': errors}

def sanitize_filename(filename: str) -> str:
    """Sanitiza nome de arquivo"""
    # Remove caracteres perigosos
    filename = re.sub(r'[<>:"/\\|?*]', '_', filename)
    # Remove espaços extras
    filename = re.sub(r'\s+', '_', filename)
    # Limita tamanho
    if len(filename) > 255:
        name, ext = filename.rsplit('.', 1) if '.' in filename else (filename, '')
        filename = name[:255-len(ext)-1] + '.' + ext if ext else name[:255]
    return filename 