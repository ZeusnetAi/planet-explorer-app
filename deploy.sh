#!/bin/bash

# Script de Deploy para VPS Oracle ARM
# Planet API Explorer

set -e

echo "🚀 Iniciando deploy do Planet API Explorer na VPS Oracle ARM..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log colorido
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Verificar se está rodando como root
if [[ $EUID -eq 0 ]]; then
   error "Este script não deve ser executado como root. Use um usuário com sudo."
fi

# Atualizar sistema
log "Atualizando sistema..."
sudo apt update && sudo apt upgrade -y

# Instalar dependências básicas
log "Instalando dependências básicas..."
sudo apt install -y \
    curl \
    wget \
    git \
    unzip \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    htop \
    nano \
    ufw

# Instalar Docker
log "Instalando Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt update
    sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    sudo usermod -aG docker $USER
    log "Docker instalado. Você precisará fazer logout e login novamente para usar Docker sem sudo."
else
    log "Docker já está instalado."
fi

# Instalar Docker Compose
log "Instalando Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
else
    log "Docker Compose já está instalado."
fi

# Configurar firewall
log "Configurando firewall..."
sudo ufw --force enable
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 22

# Criar diretório do projeto
PROJECT_DIR="/opt/planet-explorer"
log "Criando diretório do projeto em $PROJECT_DIR..."
sudo mkdir -p $PROJECT_DIR
sudo chown $USER:$USER $PROJECT_DIR

# Clonar ou copiar o projeto
if [ -d ".git" ]; then
    log "Copiando projeto atual..."
    cp -r . $PROJECT_DIR/
else
    log "Clonando projeto do GitHub..."
    git clone https://github.com/ZeusnetAi/planet-explorer-app.git $PROJECT_DIR
fi

cd $PROJECT_DIR

# Criar arquivo .env
log "Configurando variáveis de ambiente..."
if [ ! -f ".env" ]; then
    cat > .env << EOF
# Configuração da Aplicação
FLASK_ENV=production
SECRET_KEY=$(openssl rand -hex 32)

# API da Planet (SUBSTITUA PELA SUA CHAVE)
PLANET_API_KEY=PLAK7aff885520da45a68765d35f1a74289d

# Banco de Dados
DATABASE_URL=sqlite:///app.db

# Logging
LOG_LEVEL=INFO

# Configurações de Upload
MAX_CONTENT_LENGTH=16777216
EOF
    warn "Arquivo .env criado. ATENÇÃO: Configure sua PLANET_API_KEY no arquivo .env"
fi

# Criar certificados SSL auto-assinados (temporários)
log "Criando certificados SSL temporários..."
sudo mkdir -p /opt/planet-explorer/ssl
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /opt/planet-explorer/ssl/key.pem \
    -out /opt/planet-explorer/ssl/cert.pem \
    -subj "/C=BR/ST=SP/L=SaoPaulo/O=PlanetExplorer/CN=localhost"

sudo chown -R $USER:$USER /opt/planet-explorer/ssl

# Construir e iniciar containers
log "Construindo e iniciando containers..."
docker-compose down --remove-orphans
docker-compose build --no-cache
docker-compose up -d

# Aguardar serviços iniciarem
log "Aguardando serviços iniciarem..."
sleep 30

# Verificar status dos containers
log "Verificando status dos containers..."
docker-compose ps

# Testar health check
log "Testando health check..."
sleep 10
if curl -f http://localhost/api/health > /dev/null 2>&1; then
    log "✅ Health check passou!"
else
    warn "⚠️ Health check falhou. Verificando logs..."
    docker-compose logs backend
fi

# Configurar SSL com Let's Encrypt (opcional)
echo ""
echo -e "${BLUE}=== CONFIGURAÇÃO SSL COM LET'S ENCRYPT ===${NC}"
echo "Para configurar SSL com Let's Encrypt:"
echo "1. Configure seu domínio para apontar para este servidor"
echo "2. Execute: ./setup-ssl.sh seu-dominio.com"
echo ""

# Criar script de setup SSL
cat > setup-ssl.sh << 'EOF'
#!/bin/bash

if [ -z "$1" ]; then
    echo "Uso: $0 <seu-dominio.com>"
    exit 1
fi

DOMAIN=$1

# Instalar certbot
sudo apt install -y certbot python3-certbot-nginx

# Parar nginx temporariamente
docker-compose stop nginx

# Obter certificado
sudo certbot certonly --standalone -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN

# Copiar certificados
sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem ssl/cert.pem
sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem ssl/key.pem
sudo chown $USER:$USER ssl/*.pem

# Reiniciar nginx
docker-compose up -d nginx

echo "SSL configurado para $DOMAIN"
EOF

chmod +x setup-ssl.sh

# Criar script de manutenção
cat > maintenance.sh << 'EOF'
#!/bin/bash

case "$1" in
    "start")
        docker-compose up -d
        ;;
    "stop")
        docker-compose down
        ;;
    "restart")
        docker-compose restart
        ;;
    "logs")
        docker-compose logs -f
        ;;
    "update")
        git pull
        docker-compose down
        docker-compose build --no-cache
        docker-compose up -d
        ;;
    "backup")
        docker-compose exec backend tar -czf /app/backup-$(date +%Y%m%d).tar.gz /app/instance
        ;;
    *)
        echo "Uso: $0 {start|stop|restart|logs|update|backup}"
        exit 1
        ;;
esac
EOF

chmod +x maintenance.sh

# Configurar cron para renovação SSL
if [ -f "setup-ssl.sh" ]; then
    (crontab -l 2>/dev/null; echo "0 12 * * * cd $PROJECT_DIR && ./setup-ssl.sh > /dev/null 2>&1") | crontab -
fi

# Informações finais
echo ""
echo -e "${GREEN}🎉 DEPLOY CONCLUÍDO COM SUCESSO! 🎉${NC}"
echo ""
echo -e "${BLUE}=== INFORMAÇÕES IMPORTANTES ===${NC}"
echo "📁 Diretório do projeto: $PROJECT_DIR"
echo "🌐 URL da aplicação: http://$(curl -s ifconfig.me)"
echo "🔧 Comandos úteis:"
echo "   - cd $PROJECT_DIR"
echo "   - ./maintenance.sh start|stop|restart|logs|update"
echo "   - docker-compose ps (ver status)"
echo "   - docker-compose logs -f (ver logs)"
echo ""
echo -e "${YELLOW}⚠️ PRÓXIMOS PASSOS:${NC}"
echo "1. Configure sua PLANET_API_KEY no arquivo .env"
echo "2. Configure seu domínio e execute: ./setup-ssl.sh seu-dominio.com"
echo "3. Reinicie os serviços: ./maintenance.sh restart"
echo ""
echo -e "${GREEN}✅ Seu Planet API Explorer está rodando!${NC}" 