#!/bin/bash

# Script de Backup para Planet API Explorer

set -e

# Configurações
BACKUP_DIR="/opt/planet-explorer/backups"
DATE=$(date +%Y%m%d_%H%M%S)
PROJECT_DIR="/opt/planet-explorer"

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

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

# Verificar se estamos no diretório correto
if [ ! -f "$PROJECT_DIR/docker-compose.yml" ]; then
    error "Projeto não encontrado em $PROJECT_DIR"
fi

# Criar diretório de backup
mkdir -p "$BACKUP_DIR"

# Nome do arquivo de backup
BACKUP_FILE="planet-explorer-backup-$DATE.tar.gz"

log "Iniciando backup do Planet API Explorer..."

# Parar serviços temporariamente para backup consistente
log "Parando serviços..."
cd "$PROJECT_DIR"
docker-compose stop

# Aguardar serviços pararem
sleep 10

# Fazer backup dos dados importantes
log "Fazendo backup dos dados..."

# Backup do banco de dados e uploads
docker-compose run --rm backend tar -czf /tmp/backend-data.tar.gz \
    -C /app instance uploads logs

# Backup das configurações
tar -czf "$BACKUP_DIR/$BACKUP_FILE" \
    --exclude='node_modules' \
    --exclude='venv' \
    --exclude='*.log' \
    --exclude='backups' \
    --exclude='ssl' \
    .

# Copiar backup do backend para o host
docker cp $(docker-compose ps -q backend):/tmp/backend-data.tar.gz "$BACKUP_DIR/backend-data-$DATE.tar.gz"

# Reiniciar serviços
log "Reiniciando serviços..."
docker-compose up -d

# Aguardar serviços iniciarem
sleep 30

# Verificar se serviços estão rodando
if docker-compose ps | grep -q "Up"; then
    log "Serviços reiniciados com sucesso"
else
    error "Falha ao reiniciar serviços"
fi

# Limpar backups antigos (manter apenas últimos 7 dias)
log "Limpando backups antigos..."
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +7 -delete

# Verificar tamanho do backup
BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
BACKEND_SIZE=$(du -h "$BACKUP_DIR/backend-data-$DATE.tar.gz" | cut -f1)

log "Backup concluído com sucesso!"
echo "📁 Backup principal: $BACKUP_DIR/$BACKUP_FILE ($BACKUP_SIZE)"
echo "📁 Backup backend: $BACKUP_DIR/backend-data-$DATE.tar.gz ($BACKEND_SIZE)"

# Listar backups disponíveis
echo ""
echo "📋 Backups disponíveis:"
ls -lh "$BACKUP_DIR"/*.tar.gz 2>/dev/null || echo "Nenhum backup encontrado"

# Verificar espaço em disco
DISK_USAGE=$(df -h "$BACKUP_DIR" | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 80 ]; then
    warn "Uso de disco alto: ${DISK_USAGE}%"
fi

log "Backup concluído em $(date)" 