# Planet API Explorer - Backend (Flask)

Este é o servidor backend para o Planet API Explorer, construído com Flask. Ele atua como um proxy seguro entre o frontend (React) e a API da Planet, gerenciando as chaves de API, processando requisições e servindo dados em um formato amigável para a aplicação.

## Estrutura e Funcionalidades

O backend é responsável por:
- Gerenciar a chave da API da Planet de forma segura.
- Fornecer endpoints para o frontend consumir.
- Interagir com a API da Planet para buscar séries, mosaicos, quads e imagens.
- Processar e converter imagens (GeoTIFF para PNG), **aplicando melhorias de brilho, contraste e cor** para exibição no mapa.
- Implementar um cache simples para otimizar requisições repetidas.

---

## ✨ Principais Funcionalidades da Interface

A interface foi projetada para ser poderosa e intuitiva, oferecendo as seguintes funcionalidades:

-   **Visualização de Múltiplos Quads**: Para cobrir completamente um polígono ou área de interesse, você pode selecionar e visualizar múltiplos "quads" (as peças do mosaico de satélite) simultaneamente no mapa.
-   **Seletor de Camadas de Mapa**: Um controle no canto do mapa permite alternar dinamicamente entre diferentes mapas base para melhor contexto e visualização:
    -   **Claro**: Tema limpo e claro (Padrão).
    -   **Escuro**: Tema escuro para visualização noturna.
    -   **OpenStreetMap**: Mapa detalhado com ruas e locais.
    -   **Satélite**: Imagens de satélite como mapa base.
    -   **Terreno**: Mapa topográfico com relevo.
-   **Melhoria Automática de Imagens**: As imagens de satélite exibidas no mapa passam por um processo automático no backend que melhora o brilho, contraste e saturação, resultando em uma visualização muito mais clara e com cores mais vibrantes.

---

## Guia de Endpoints da API

Aqui estão os principais endpoints que o backend fornece:

- `GET /api/basemap/series`
  - **Função:** Lista todas as séries de basemaps disponíveis.
  - **Utilização:** Preenche o seletor "Série do Basemap" no frontend.

- `GET /api/basemap/mosaics?series_id=<id>&year=<ano>&month=<mes>`
  - **Função:** Encontra o `mosaic_id` correspondente a uma série e um período (ano/mês).
  - **Utilização:** Passo intermediário para encontrar o mosaico correto antes de buscar os quads.

- `POST /api/basemap/quads`
  - **Função:** Busca os quads (as "peças" do mapa) que intersectam com a geometria desenhada pelo usuário.
  - **Payload:** `{ "mosaic_id": "...", "geometry": { ... }, "series_id": "..." }`
  - **Retorno:** Uma lista de objetos de quads, contendo informações básicas como ID e BBox.
  - **Importante:** Este endpoint retorna uma lista resumida. Os objetos de quad aqui **não** contêm o link para a imagem.

- `GET /api/basemap/quad/<mosaic_id>/<quad_id>`
  - **Função:** Busca os **detalhes completos** de um único quad.
  - **Utilização:** Passo crucial para obter o link de download da imagem do quad.

- `GET /api/basemap/quad/preview?mosaic_id=<id>&quad_id=<id>`
  - **Função:** **Este é o endpoint correto para exibir a imagem de um quad no mapa.** Ele baixa a imagem do quad (que vem em formato GeoTIFF), converte para PNG e a transmite para o frontend.
  - **Utilização:** Deve ser usado pelo componente `ImageOverlay` do Leaflet no frontend.

---

## ⚠️ Lições Aprendidas e Pontos Críticos (Atenção!)

A depuração deste projeto revelou um ponto fundamental sobre a API de Basemaps da Planet que causou a maioria dos nossos problemas.

### **Como Exibir a Imagem de um Quad de Basemap (O Jeito Certo)**

O erro mais persistente que enfrentamos foi tentar usar uma camada de "tiles" (`TileLayer`) para exibir a imagem de um quad individual. **Isso não funciona.**

O fluxo correto é:

1.  **Buscar a Lista de Quads:** O frontend envia a geometria para a rota `POST /api/basemap/quads`. O backend retorna uma lista de quads que correspondem à área.
2.  **Selecionar Quads**: O usuário pode clicar no botão "Mapa" de **um ou mais quads** na lista de resultados. A interface permite a seleção múltipla para cobrir toda a área de um polígono.
3.  **Buscar Detalhes do Quad:** O frontend **não** tenta adivinhar uma URL de tiles. Em vez disso, a função do botão "Mapa" (`handleShowBasemapOnMap` no `App.jsx`) armazena o `mosaic_id` e o `id` de cada quad selecionado.
4.  **Usar `ImageOverlay`:** O componente de mapa (`MapDisplay.jsx`) detecta que há quads para serem exibidos. Ele então usa o `mosaic_id` e o `id` de cada um para construir URLs que apontam para a rota de preview do **nosso próprio backend**: `GET /api/basemap/quad/preview`.
5.  **Renderizar as Imagens**: O componente `ImageOverlay` do Leaflet recebe as imagens PNG (uma para cada quad selecionado) vindas do nosso backend e as exibe no mapa, usando o `bbox` (bounding box) de cada quad para posicioná-las corretamente.

**Resumo da Armadilha:** Não tente usar `TileLayer` para um único quad. A API não fornece uma URL de tiles para isso. Use `ImageOverlay` e aponte para a rota `/preview` do backend.
