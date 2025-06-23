# Planet Explorer Frontend

## Pré-requisitos
- Node.js 18+
- pnpm ou npm

## Instalação e build

1. Instale as dependências:
   ```
   cd Frontend
   pnpm install
   # ou npm install
   ```

2. Rode em modo desenvolvimento:
   ```
   pnpm run dev
   # ou npm run dev
   ```

3. Para build de produção:
   ```
   pnpm run build
   # ou npm run build
   ```

4. O build final será servido automaticamente pelo Nginx do container.

## Observações
- O frontend já está configurado para consumir o backend via `/api`.
- Para deploy, use o Docker Compose na raiz do projeto. 