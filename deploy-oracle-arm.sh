#!/bin/bash

# Script de Deploy para VPS Oracle ARM Ubuntu 24.04
# Planet API Explorer - Otimizado para ARM64

set -e

echo "🚀 Iniciando deploy do Planet API Explorer na VPS Oracle ARM Ubuntu 24.04..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
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

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Verificar se está rodando como root
if [[ $EUID -eq 0 ]]; then
   error "Este script não deve ser executado como root. Use um usuário com sudo."
fi

# Verificar arquitetura
ARCH=$(uname -m)
if [[ "$ARCH" != "aarch64" && "$ARCH" != "arm64" ]]; then
    warn "Este script foi otimizado para ARM64. Arquitetura detectada: $ARCH"
fi

# Verificar versão do Ubuntu
UBUNTU_VERSION=$(lsb_release -rs)
if [[ "$UBUNTU_VERSION" != "24.04" ]]; then
    warn "Este script foi testado no Ubuntu 24.04. Versão detectada: $UBUNTU_VERSION"
fi

# Atualizar sistema
log "Atualizando sistema Ubuntu 24.04..."
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
    ufw \
    fail2ban \
    nginx \
    certbot \
    python3-certbot-nginx

# Instalar Docker para ARM64
log "Instalando Docker para ARM64..."
if ! command -v docker &> /dev/null; then
    # Remover versões antigas
    sudo apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true
    
    # Adicionar repositório oficial do Docker
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    sudo apt update
    sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Adicionar usuário ao grupo docker
    sudo usermod -aG docker $USER
    
    # Iniciar e habilitar Docker
    sudo systemctl start docker
    sudo systemctl enable docker
    
    log "Docker instalado para ARM64. Você precisará fazer logout e login novamente para usar Docker sem sudo."
else
    log "Docker já está instalado."
fi

# Instalar Docker Compose (versão standalone para compatibilidade)
log "Instalando Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    log "Docker Compose instalado."
else
    log "Docker Compose já está instalado."
fi

# Configurar firewall
log "Configurando firewall UFW..."
sudo ufw --force enable
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 22

# Configurar fail2ban
log "Configurando fail2ban..."
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Criar diretório do projeto
PROJECT_DIR="/opt/planet-explorer"
log "Criando diretório do projeto em $PROJECT_DIR..."
sudo mkdir -p $PROJECT_DIR
sudo chown $USER:$USER $PROJECT_DIR

# Copiar projeto atual
log "Copiando projeto atual..."
cp -r . $PROJECT_DIR/
cd $PROJECT_DIR

# Criar arquivo .env
log "Configurando variáveis de ambiente..."
if [ ! -f ".env" ]; then
    cat > .env << EOF
# Configuração da Aplicação
FLASK_ENV=production
SECRET_KEY=$(openssl rand -hex 32)

# API da Planet (SUBSTITUA PELA SUA CHAVE)
PLANET_API_KEY=SUA_CHAVE_PLANET_AQUI

# Banco de Dados
DATABASE_URL=sqlite:///app.db

# Logging
LOG_LEVEL=INFO

# Configurações de Upload
MAX_CONTENT_LENGTH=16777216

# Configurações de Performance para ARM64
WORKERS=2
THREADS=4
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

# Otimizar configuração do Docker para ARM64
log "Otimizando configuração do Docker para ARM64..."
sudo tee /etc/docker/daemon.json > /dev/null << EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "storage-opts": [
    "overlay2.override_kernel_check=true"
  ]
}
EOF

# Reiniciar Docker para aplicar configurações
sudo systemctl restart docker

# Construir e iniciar containers
log "Construindo e iniciando containers..."
docker-compose down --remove-orphans
docker-compose build --no-cache
docker-compose up -d

# Aguardar serviços iniciarem
log "Aguardando serviços iniciarem..."
sleep 45

# Verificar status dos containers
log "Verificando status dos containers..."
docker-compose ps

# Testar health check
log "Testando health check..."
sleep 15
if curl -f http://localhost/api/health > /dev/null 2>&1; then
    log "✅ Health check passou!"
else
    warn "⚠️ Health check falhou. Verificando logs..."
    docker-compose logs backend
fi

# Criar script de setup SSL otimizado
cat > setup-ssl.sh << 'EOF'
#!/bin/bash

if [ -z "$1" ]; then
    echo "Uso: $0 <seu-dominio.com>"
    exit 1
fi

DOMAIN=$1

echo "🔒 Configurando SSL para $DOMAIN..."

# Parar nginx temporariamente
docker-compose stop nginx

# Obter certificado com Let's Encrypt
sudo certbot certonly --standalone -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN

# Copiar certificados
sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem ssl/cert.pem
sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem ssl/key.pem
sudo chown $USER:$USER ssl/*.pem

# Reiniciar nginx
docker-compose up -d nginx

echo "✅ SSL configurado para $DOMAIN"
echo "🌐 Acesse: https://$DOMAIN"
EOF

chmod +x setup-ssl.sh

# Criar script de manutenção otimizado
cat > maintenance.sh << 'EOF'
#!/bin/bash

PROJECT_DIR="/opt/planet-explorer"
cd $PROJECT_DIR

case "$1" in
    "start")
        echo "🚀 Iniciando serviços..."
        docker-compose up -d
        ;;
    "stop")
        echo "🛑 Parando serviços..."
        docker-compose down
        ;;
    "restart")
        echo "🔄 Reiniciando serviços..."
        docker-compose restart
        ;;
    "logs")
        echo "📋 Mostrando logs..."
        docker-compose logs -f
        ;;
    "update")
        echo "📦 Atualizando aplicação..."
        git pull
        docker-compose down
        docker-compose build --no-cache
        docker-compose up -d
        ;;
    "backup")
        echo "💾 Fazendo backup..."
        BACKUP_FILE="backup-$(date +%Y%m%d_%H%M%S).tar.gz"
        docker-compose exec backend tar -czf /app/$BACKUP_FILE /app/instance
        echo "Backup criado: $BACKUP_FILE"
        ;;
    "status")
        echo "📊 Status dos serviços:"
        docker-compose ps
        echo ""
        echo "💾 Uso de recursos:"
        docker stats --no-stream
        ;;
    "cleanup")
        echo "🧹 Limpando recursos não utilizados..."
        docker system prune -f
        docker volume prune -f
        ;;
    *)
        echo "Uso: $0 {start|stop|restart|logs|update|backup|status|cleanup}"
        exit 1
        ;;
esac
EOF

chmod +x maintenance.sh

# Criar script de monitoramento
cat > monitoring.sh << 'EOF'
#!/bin/bash

echo "📊 Monitoramento do Sistema"
echo "=========================="

echo "🖥️ CPU e Memória:"
htop -n 1 -d 1

echo ""
echo "💾 Espaço em disco:"
df -h

echo ""
echo "🐳 Status dos containers:"
docker-compose ps

echo ""
echo "📋 Logs recentes do backend:"
docker-compose logs --tail=20 backend

echo ""
echo "🌐 Teste de conectividade:"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost/api/health
EOF

chmod +x monitoring.sh

# Configurar cron para renovação SSL e monitoramento
log "Configurando tarefas agendadas..."
(crontab -l 2>/dev/null; echo "0 12 * * * cd $PROJECT_DIR && ./setup-ssl.sh > /dev/null 2>&1") | crontab -
(crontab -l 2>/dev/null; echo "0 */6 * * * cd $PROJECT_DIR && ./maintenance.sh cleanup > /dev/null 2>&1") | crontab -

# Obter IP público
PUBLIC_IP=$(curl -s ifconfig.me)

# Informações finais
echo ""
echo -e "${GREEN}🎉 DEPLOY CONCLUÍDO COM SUCESSO! 🎉${NC}"
echo ""
echo -e "${PURPLE}=== INFORMAÇÕES DO SERVIDOR ===${NC}"
echo "🖥️  Arquitetura: $ARCH"
echo "🐧 Sistema: Ubuntu $UBUNTU_VERSION"
echo "📁 Diretório: $PROJECT_DIR"
echo "🌐 IP Público: $PUBLIC_IP"
echo ""
echo -e "${BLUE}=== COMANDOS ÚTEIS ===${NC}"
echo "🔧 Manutenção:"
echo "   cd $PROJECT_DIR"
echo "   ./maintenance.sh start|stop|restart|logs|update|backup|status|cleanup"
echo ""
echo "📊 Monitoramento:"
echo "   ./monitoring.sh"
echo "   docker-compose ps"
echo "   docker stats"
echo ""
echo -e "${YELLOW}⚠️ PRÓXIMOS PASSOS OBRIGATÓRIOS:${NC}"
echo "1. Configure sua PLANET_API_KEY no arquivo .env:"
echo "   nano $PROJECT_DIR/.env"
echo ""
echo "2. Reinicie os serviços:"
echo "   ./maintenance.sh restart"
echo ""
echo "3. Configure SSL com seu domínio:"
echo "   ./setup-ssl.sh seu-dominio.com"
echo ""
echo -e "${GREEN}✅ Seu Planet API Explorer está rodando em: http://$PUBLIC_IP${NC}"
echo ""
echo -e "${PURPLE}🔒 Segurança configurada:${NC}"
echo "✅ Firewall UFW ativo"
echo "✅ Fail2ban configurado"
echo "✅ Docker otimizado para ARM64"
echo "✅ Logs rotacionados" 