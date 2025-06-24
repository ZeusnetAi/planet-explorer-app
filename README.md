# 🌎 Planet Explorer App

Sistema completo para explorar imagens de satélite da Planet, com backend em Flask e frontend em React, pronto para deploy e replicação em qualquer VPS.

## Visão Geral
- **Backend:** Python (Flask), serve como proxy seguro para a API da Planet, processa imagens, gerencia chaves e serve dados otimizados para o frontend.
- **Frontend:** React, interface moderna para busca, visualização e download de imagens de satélite, com mapas interativos.
- **Infraestrutura:** Docker Compose, Nginx, scripts de automação e deploy.

## 🚀 Como replicar/deployar este projeto em outra VPS

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/ZeusnetAi/planet-explorer-app.git
   cd planet-explorer-app
   ```
2. **(Opcional) Baixe o arquivo de embargos:**
   > O arquivo `Backend/src/static/embargos.geojson` não é versionado devido ao tamanho. Para gerar/baixar:
   ```bash
   python3 Backend/src/utils/download_embargos.py
   ```
3. **Configure as variáveis de ambiente:**
   - Copie o arquivo `Backend/env.example` para `.env` e ajuste conforme necessário.
4. **Suba tudo com Docker Compose:**
   ```bash
   docker-compose up -d --build
   ```
5. **Acesse a aplicação:**
   - Via navegador: `https://<SEU_DOMINIO>/` ou `http://<SEU_IP>:80`

## Estrutura do Projeto
```
planet-explorer-app/
  Backend/    # Código do backend Flask
  Frontend/   # Código do frontend React
  nginx_html/ # Build estático do frontend (usado pelo Nginx)
  ssl/        # Certificados SSL (opcional)
  docker-compose.yml
  nginx.conf
  ...
```

## Observações Importantes
- O arquivo `embargos.geojson` é grande e não está versionado. Use o script de automação para baixá-lo sempre que necessário.
- O frontend já está configurado para consumir o backend via `/api`.
- O deploy padrão é via Docker Compose, mas você pode rodar backend e frontend separadamente se desejar.
- **Este repositório está pronto para ser replicado em qualquer VPS seguindo os passos acima.**

---

Para detalhes avançados, consulte os READMEs nas pastas `Backend/` e `Frontend/`. 