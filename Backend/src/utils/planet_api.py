import os
import logging
import requests
from requests.auth import HTTPBasicAuth
from flask import g
from datetime import datetime
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
import time

# --- Configuração do Logger ---
logger = logging.getLogger(__name__)

# --- Classes de Erro Customizadas ---
class APIError(Exception):
    """Exceção base para erros da API da Planet."""
    def __init__(self, message, status_code=500):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
    
    def to_dict(self):
        return {'error': self.message, 'status_code': self.status_code}

class QuotaError(APIError):
    """Exceção para erros de cota excedida."""
    pass

class RateLimitError(APIError):
    """Exceção para erros de limite de taxa."""
    pass

# --- Cliente da API da Planet ---
class PlanetAPIClient:
    """Um cliente para interagir com as APIs da Planet."""

    def __init__(self, api_key):
        if not api_key:
            raise ValueError("A chave da API da Planet (PLANET_API_KEY) não foi configurada.")
        self.api_key = api_key
        self.base_url = "https://api.planet.com"
        self.session = self._create_session()

    def _create_session(self):
        """Cria e configura uma sessão de requisições com a chave da API."""
        session = requests.Session()
        session.auth = (self.api_key, '')
        return session

    def _request(self, method, url, **kwargs):
        """Método unificado para fazer requisições e tratar erros comuns."""
        try:
            response = self.session.request(method, url, **kwargs)
            
            if response.status_code == 403:
                raise QuotaError("Cota da API da Planet excedida ou permissão negada.", status_code=403)
            if response.status_code == 429:
                raise RateLimitError("Limite de requisições da API da Planet atingido.", status_code=429)
            
            response.raise_for_status()
            
            # Algumas respostas (como download) podem não ter corpo JSON
            if response.content:
                try:
                    logger.debug(f"Resposta JSON recebida. Status: {response.status_code}")
                    return response
                except ValueError:
                    logger.warning(f"Resposta não era JSON válido. Status: {response.status_code}")
                    return response # Retorna a resposta original
            return response

        except requests.exceptions.HTTPError as e:
            logger.error(f"Erro HTTP na API da Planet: {e.response.text}")
            raise APIError(f"Erro na API da Planet: {e.response.text}", status_code=e.response.status_code)
        except requests.exceptions.RequestException as e:
            logger.error(f"Erro de comunicação com a API da Planet: {e}")
            raise APIError(f"Erro de comunicação com a API da Planet: {e}")

    def get_item_types(self):
        """Busca os tipos de item disponíveis na API de dados."""
        url = f"{self.base_url}/data/v1/item-types"
        try:
            response = self._request('GET', url)
            return response.json().get('item_types', [])
        except (requests.exceptions.RequestException, APIError) as e:
            logger.error(f"Erro ao buscar item types: {e}")
            raise APIError(f"Erro ao buscar os tipos de item da Planet: {e}")

    def search_items(self, search_payload):
        """Realiza uma busca paginada por itens na Planet API."""
        all_features = []
        search_url = f"{self.base_url}/data/v1/quick-search"
        current_payload = search_payload

        while search_url:
            try:
                res = self.session.post(search_url, json=current_payload)
                res.raise_for_status()
                page = res.json()
                
                if 'features' in page and page['features']:
                    all_features.extend(page['features'])
                
                search_url = page.get('_links', {}).get('_next')
                current_payload = None 

            except requests.exceptions.RequestException as e:
                raise APIError(f"Erro de conexão com a API da Planet: {e}")
            except Exception as e:
                raise APIError(f"Erro inesperado durante a busca de itens: {e}")
        
        return all_features
    
    def get_series(self):
        """Busca todas as séries de basemaps disponíveis."""
        url = f"{self.base_url}/basemaps/v1/series"
        params = {'api_key': self.api_key}
        logger.debug(f"Fazendo requisição GET para {url} com params: {params}")
        response = self._request('GET', url, params=params)
        return response.json()

    def get_mosaics_for_series(self, series_id):
        """Busca todos os mosaicos para uma determinada série de basemap."""
        url = f"{self.base_url}/basemaps/v1/series/{series_id}/mosaics"
        params = {'api_key': self.api_key}
        logger.debug(f"Fazendo requisição GET para {url} com params: {params}")
        response = self._request('GET', url, params=params)
        return response.json()
    
    def get_quads_for_mosaic(self, mosaic_id, geometry):
        """Busca quads em um mosaico de forma assíncrona, lidando com paginação."""
        search_url = f"{self.base_url}/basemaps/v1/mosaics/{mosaic_id}/quads/search"
        params = {'api_key': self.api_key}
        
        logger.info("Iniciando busca de quads assíncrona (Etapa 1: POST)")
        # A geometria deve ser enviada como JSON no corpo da requisição
        response = self.session.post(search_url, params=params, json=geometry, allow_redirects=False)

        if response.status_code != 302:
            raise APIError(f"Esperava-se um redirecionamento (302), mas o status foi {response.status_code}. Resposta: {response.text}", response.status_code)
        
        redirect_url = response.headers['Location']
        logger.info(f"Buscando resultados da URL (Etapa 2: GET): {redirect_url}")

        items = []
        page_url = redirect_url

        while page_url:
            for _ in range(3): # Tenta algumas vezes antes de desistir
                page_response = self._request('GET', page_url)
                if page_response.status_code == 200:
                    break
                logger.warning(f"Recebido status {page_response.status_code} para a URL de quads. Tentando novamente em 2 segundos...")
                time.sleep(2)
            else:
                raise APIError(f"Não foi possível obter os resultados dos quads da URL: {page_url}", 500)
            
            def add_api_key_to_url(url, key):
                parsed_url = urlparse(url)
                query_params = parse_qs(parsed_url.query)
                if 'api_key' not in query_params:
                    query_params['api_key'] = [key]
                    new_query = urlencode(query_params, doseq=True)
                    parsed_url = parsed_url._replace(query=new_query)
                return urlunparse(parsed_url)

            try:
                page_data = page_response.json()
                items.extend(page_data.get('items', []))
                
                next_link = page_data.get('_links', {}).get('_next')
                if next_link:
                    page_url = add_api_key_to_url(next_link, self.api_key)
                    logger.info(f"Paginando para a próxima URL: {page_url}")
                else:
                    logger.info("Não há link '_next' na página. Concluindo paginação.")
                    page_url = None
            except ValueError:
                logger.error("A resposta da API de quads não é um JSON válido.")
                page_url = None
        
        logger.info(f"Busca de quads concluída. Total de {len(items)} quads encontrados.")
        return items

    def download_quad_thumbnail(self, quad_id, mosaic_id, output_dir):
        """Baixa um thumbnail de um quad específico."""
        os.makedirs(output_dir, exist_ok=True)
        filepath = os.path.join(output_dir, f"{quad_id}.png")
        url = f"{self.base_url}/basemaps/v1/mosaics/{mosaic_id}/quads/{quad_id}/full"
        params = {'api_key': self.api_key}
        
        try:
            response = self._request('GET', url, params=params, stream=True)
            with open(filepath, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            logger.info(f"Thumbnail do quad {quad_id} baixado para {filepath}")
            return filepath
        except APIError:
            logger.error(f"Falha ao baixar thumbnail do quad {quad_id}.")
            raise

    def get_quad_details(self, mosaic_id, quad_id):
        """Busca os detalhes completos de um quad."""
        url = f"{self.base_url}/basemaps/v1/mosaics/{mosaic_id}/quads/{quad_id}"
        logger.debug(f"Buscando detalhes do quad: {url}")
        response = self._request('GET', url)
        return response.json()

def build_search_payload(search_data):
    """Constrói o payload para a API de busca da Planet a partir de dados de formulário."""
    
    date_filter = {
        "type": "DateRangeFilter",
        "field_name": "acquired",
        "config": {
            "gte": search_data['start_date'],
            "lte": search_data['end_date']
        }
    }

    cloud_cover_filter = {
        "type": "RangeFilter",
        "field_name": "cloud_cover",
        "config": {
            "lte": search_data.get('max_cloud_cover', 1.0) 
        }
    }
    
    geometry_filter = {
        "type": "GeometryFilter",
        "field_name": "geometry",
        "config": search_data['geometry']
    }

    combined_filter = {
        "type": "AndFilter",
        "config": [
            date_filter,
            cloud_cover_filter,
            geometry_filter
        ]
    }
    
    search_payload = {
        "item_types": search_data['item_types'],
        "filter": combined_filter
    }
    
    return search_payload

# --- Gerenciamento de Instância Global ---
def get_planet_client():
    """
    Obtém uma instância do cliente da API Planet, criando uma se não existir no contexto da requisição.
    """
    if 'planet_client' not in g:
        api_key = os.getenv('PLANET_API_KEY')
        if not api_key:
            raise ValueError("A chave da API da Planet não foi configurada na variável de ambiente PLANET_API_KEY.")
        g.planet_client = PlanetAPIClient(api_key=api_key)
    return g.planet_client 