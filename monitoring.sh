#!/bin/bash

# Script de Monitoramento para Planet API Explorer

# Configurações
PROJECT_DIR="/opt/planet-explorer"
LOG_FILE="/opt/planet-explorer/monitoring.log"
ALERT_EMAIL="admin@seu-dominio.com"  # Configure seu email

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a "$LOG_FILE"
}

# Função para enviar alerta por email
send_alert() {
    local subject="$1"
    local message="$2"
    
    if command -v mail &> /dev/null; then
        echo "$message" | mail -s "$subject" "$ALERT_EMAIL"
    else
        echo "ALERTA: $subject - $message" >> "$LOG_FILE"
    fi
}

# Verificar se estamos no diretório correto
if [ ! -f "$PROJECT_DIR/docker-compose.yml" ]; then
    error "Projeto não encontrado em $PROJECT_DIR"
    exit 1
fi

cd "$PROJECT_DIR"

log "Iniciando monitoramento do Planet API Explorer..."

# 1. Verificar se Docker está rodando
if ! docker info > /dev/null 2>&1; then
    error "Docker não está rodando"
    send_alert "Planet Explorer - Docker Down" "Docker não está rodando no servidor"
    exit 1
fi

# 2. Verificar containers
if ! docker-compose ps | grep -q "Up"; then
    error "Containers não estão rodando"
    send_alert "Planet Explorer - Containers Down" "Containers não estão rodando"
    
    # Tentar reiniciar
    log "Tentando reiniciar containers..."
    docker-compose up -d
    sleep 30
    
    if docker-compose ps | grep -q "Up"; then
        log "Containers reiniciados com sucesso"
    else
        error "Falha ao reiniciar containers"
        send_alert "Planet Explorer - Reinicialização Falhou" "Falha ao reiniciar containers"
    fi
fi

# 3. Verificar health check
if ! curl -f http://localhost/api/health > /dev/null 2>&1; then
    error "Health check falhou"
    send_alert "Planet Explorer - Health Check Failed" "Health check da aplicação falhou"
else
    log "Health check OK"
fi

# 4. Verificar recursos do sistema
# CPU
cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
if (( $(echo "$cpu_usage > 90" | bc -l) )); then
    warn "CPU muito alto: ${cpu_usage}%"
    send_alert "Planet Explorer - CPU Alto" "CPU em ${cpu_usage}%"
fi

# Memória
mem_usage=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
if (( $(echo "$mem_usage > 90" | bc -l) )); then
    warn "Memória muito alta: ${mem_usage}%"
    send_alert "Planet Explorer - Memória Alta" "Memória em ${mem_usage}%"
fi

# Disco
disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$disk_usage" -gt 90 ]; then
    warn "Disco muito alto: ${disk_usage}%"
    send_alert "Planet Explorer - Disco Alto" "Disco em ${disk_usage}%"
fi

# 5. Verificar logs de erro
error_count=$(docker-compose logs --since=1h | grep -i error | wc -l)
if [ "$error_count" -gt 10 ]; then
    warn "Muitos erros nos logs: $error_count"
    send_alert "Planet Explorer - Muitos Erros" "Encontrados $error_count erros na última hora"
fi

# 6. Verificar conectividade externa
if ! curl -f https://api.planet.com/data/v1/item-types > /dev/null 2>&1; then
    warn "Problemas de conectividade com Planet API"
    send_alert "Planet Explorer - Conectividade" "Problemas de conectividade com Planet API"
fi

# 7. Verificar SSL (se configurado)
if [ -f "ssl/cert.pem" ] && [ -f "ssl/key.pem" ]; then
    if ! curl -k -f https://localhost/ > /dev/null 2>&1; then
        warn "SSL não está respondendo"
        send_alert "Planet Explorer - SSL" "SSL configurado mas não está respondendo"
    fi
fi

# 8. Verificar espaço em disco para backups
backup_dir="/opt/planet-explorer/backups"
if [ -d "$backup_dir" ]; then
    backup_usage=$(df "$backup_dir" | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ "$backup_usage" -gt 95 ]; then
        warn "Espaço para backup muito baixo: ${backup_usage}%"
        send_alert "Planet Explorer - Backup" "Espaço para backup muito baixo: ${backup_usage}%"
    fi
fi

# 9. Verificar uptime dos containers
container_uptime=$(docker-compose ps | grep "Up" | head -1 | awk '{print $4}')
if [[ "$container_uptime" == *"hours"* ]] || [[ "$container_uptime" == *"days"* ]]; then
    log "Containers rodando há: $container_uptime"
fi

# 10. Verificar firewall
if ! sudo ufw status | grep -q "Status: active"; then
    warn "Firewall não está ativo"
    send_alert "Planet Explorer - Firewall" "Firewall não está ativo"
fi

# Resumo do monitoramento
log "Monitoramento concluído"
echo "📊 Status:"
echo "   - Docker: OK"
echo "   - Containers: $(docker-compose ps | grep -c 'Up')/3 rodando"
echo "   - Health Check: $(curl -f http://localhost/api/health > /dev/null 2>&1 && echo 'OK' || echo 'FAIL')"
echo "   - CPU: ${cpu_usage}%"
echo "   - Memória: ${mem_usage}%"
echo "   - Disco: ${disk_usage}%"
echo "   - Erros (1h): $error_count"

# Limpar log antigo (manter apenas últimos 7 dias)
find "$LOG_FILE" -mtime +7 -delete 2>/dev/null || true

log "Monitoramento finalizado em $(date)" 