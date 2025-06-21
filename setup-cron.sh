#!/bin/bash

# Script para configurar Cron Jobs do Planet API Explorer

set -e

PROJECT_DIR="/opt/planet-explorer"

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

# Verificar se estamos no diretório correto
if [ ! -f "$PROJECT_DIR/docker-compose.yml" ]; then
    echo "Projeto não encontrado em $PROJECT_DIR"
    exit 1
fi

cd "$PROJECT_DIR"

log "Configurando cron jobs para Planet API Explorer..."

# Fazer backup do crontab atual
crontab -l > /tmp/crontab_backup_$(date +%Y%m%d_%H%M%S) 2>/dev/null || true

# Remover cron jobs antigos do projeto
crontab -l 2>/dev/null | grep -v "planet-explorer" | grep -v "monitoring.sh" | grep -v "backup.sh" | grep -v "setup-ssl.sh" | crontab - || true

# Adicionar novos cron jobs
(crontab -l 2>/dev/null; cat << EOF

# Planet API Explorer - Cron Jobs
# Monitoramento a cada 5 minutos
*/5 * * * * cd $PROJECT_DIR && ./monitoring.sh > /dev/null 2>&1

# Backup diário às 2h da manhã
0 2 * * * cd $PROJECT_DIR && ./backup.sh > /dev/null 2>&1

# Renovação SSL semanal (domingo às 3h)
0 3 * * 0 cd $PROJECT_DIR && ./setup-ssl.sh > /dev/null 2>&1

# Limpeza de logs antigos (diário às 4h)
0 4 * * * find $PROJECT_DIR/logs -name "*.log" -mtime +7 -delete 2>/dev/null || true

# Verificação de atualizações (semanal às 5h de segunda)
0 5 * * 1 cd $PROJECT_DIR && git fetch && git status > /dev/null 2>&1

EOF
) | crontab -

log "Cron jobs configurados com sucesso!"

# Verificar cron jobs configurados
echo ""
echo "📋 Cron jobs configurados:"
crontab -l | grep -v "^#" | grep -v "^$"

# Verificar se cron está rodando
if systemctl is-active --quiet cron; then
    log "Serviço cron está ativo"
else
    warn "Serviço cron não está ativo. Iniciando..."
    sudo systemctl start cron
    sudo systemctl enable cron
fi

log "Configuração de cron jobs concluída!" 