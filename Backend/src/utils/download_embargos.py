import os
import requests
import zipfile
import shutil
import geopandas as gpd

def baixar_e_converter_embargos():
    url = "https://ftp-pamgia.ibama.gov.br/dados/adm_embargos_ibama_a.zip"
    zip_path = "/tmp/adm_embargos_ibama_a.zip"
    extract_dir = "/tmp/adm_embargos_ibama_a"
    output_geojson = os.path.join(os.path.dirname(__file__), '../static/embargos.geojson')

    # Baixar o arquivo ZIP
    print("Baixando arquivo...")
    with requests.get(url, stream=True) as r:
        r.raise_for_status()
        with open(zip_path, 'wb') as f:
            shutil.copyfileobj(r.raw, f)

    # Extrair o ZIP
    print("Extraindo arquivo...")
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(extract_dir)

    # Encontrar o SHP extraído
    shp_file = None
    for file in os.listdir(extract_dir):
        if file.endswith('.shp'):
            shp_file = os.path.join(extract_dir, file)
            break
    if not shp_file:
        raise Exception("Arquivo SHP não encontrado no ZIP!")

    # Converter para GeoJSON
    print("Convertendo para GeoJSON...")
    gdf = gpd.read_file(shp_file)
    gdf.to_file(output_geojson, driver='GeoJSON')
    print(f"GeoJSON salvo em: {output_geojson}")

    # Limpar arquivos temporários
    os.remove(zip_path)
    shutil.rmtree(extract_dir)

if __name__ == "__main__":
    baixar_e_converter_embargos() 