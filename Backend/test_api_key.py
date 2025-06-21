import os
import requests
import json

# Testar se a API key está sendo carregada
print("=== Teste de Configuração ===")
print(f"PLANET_API_KEY: {os.environ.get('PLANET_API_KEY', 'NÃO ENCONTRADA')}")

# Testar endpoint de item-types (mais simples)
print("\n=== Teste de Item Types ===")
try:
    response = requests.get("http://localhost:5000/api/planet/item-types")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Erro: {e}")

# Testar health check
print("\n=== Teste de Health Check ===")
try:
    response = requests.get("http://localhost:5000/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Erro: {e}") 