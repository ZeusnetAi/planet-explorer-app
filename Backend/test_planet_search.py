import requests
import json

url = "http://localhost:5000/api/planet/search"

payload = {
    "startDate": "2024-01-01",
    "endDate": "2024-09-01",
    "maxCloudCover": 20,
    "itemTypes": ["PSScene"],
    "geometry": {
        "type": "Polygon",
        "coordinates": [[
            [-50.65, -3.8333],
            [-50.55, -3.8333],
            [-50.55, -3.7333],
            [-50.65, -3.7333],
            [-50.65, -3.8333]
        ]]
    }
}

headers = {"Content-Type": "application/json"}

try:
    response = requests.post(url, headers=headers, data=json.dumps(payload))
    print(f"Status code: {response.status_code}")
    try:
        data = response.json()
        print(json.dumps(data, indent=2, ensure_ascii=False))
    except Exception:
        print(response.text)
except Exception as e:
    print(f"Erro ao fazer requisição: {e}") 