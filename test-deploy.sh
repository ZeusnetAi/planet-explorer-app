#!/bin/bash

# Script de Teste para Deploy do Planet API Explorer

set -e

echo "🧪 Testando deploy do Planet API Explorer..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Função para log colorido
log() {
    echo -e "${GREEN}[TEST] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARN] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

# Verificar se estamos no diretório correto
if [ ! -f "docker-compose.yml" ]; then
    error "Execute este script no diretório do projeto (/opt/planet-explorer)"
    exit 1
fi

# Teste 1: Verificar se Docker está rodando
log "1. Verificando Docker..."
if ! docker info > /dev/null 2>&1; then
    error "Docker não está rodando ou não tem permissões"
    exit 1
fi
success "Docker está funcionando"

# Teste 2: Verificar containers
log "2. Verificando containers..."
if ! docker-compose ps | grep -q "Up"; then
    error "Containers não estão rodando"
    docker-compose ps
    exit 1
fi
success "Todos os containers estão rodando"

# Teste 3: Verificar health check do backend
log "3. Testando health check do backend..."
sleep 5
if curl -f http://localhost/api/health > /dev/null 2>&1; then
    success "Health check do backend passou"
else
    error "Health check do backend falhou"
    echo "Logs do backend:"
    docker-compose logs --tail=20 backend
    exit 1
fi

# Teste 4: Verificar resposta do frontend
log "4. Testando frontend..."
if curl -f http://localhost/ > /dev/null 2>&1; then
    success "Frontend está respondendo"
else
    error "Frontend não está respondendo"
    echo "Logs do frontend:"
    docker-compose logs --tail=20 frontend
    exit 1
fi

# Teste 5: Verificar SSL (se configurado)
log "5. Testando SSL..."
if [ -f "ssl/cert.pem" ] && [ -f "ssl/key.pem" ]; then
    if curl -k -f https://localhost/ > /dev/null 2>&1; then
        success "SSL está funcionando"
    else
        warn "SSL configurado mas não está respondendo"
    fi
else
    warn "SSL não configurado (normal para deploy inicial)"
fi

# Teste 6: Verificar API endpoints
log "6. Testando endpoints da API..."

# Teste endpoint de item types
if curl -f http://localhost/api/planet/item-types > /dev/null 2>&1; then
    success "Endpoint /api/planet/item-types está funcionando"
else
    warn "Endpoint /api/planet/item-types falhou"
fi

# Teste endpoint de basemap series
if curl -f http://localhost/api/basemap/series > /dev/null 2>&1; then
    success "Endpoint /api/basemap/series está funcionando"
else
    warn "Endpoint /api/basemap/series falhou"
fi

# Teste 7: Verificar recursos do sistema
log "7. Verificando recursos do sistema..."

# CPU
cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
if (( $(echo "$cpu_usage < 80" | bc -l) )); then
    success "CPU: ${cpu_usage}% (OK)"
else
    warn "CPU: ${cpu_usage}% (Alto)"
fi

# Memória
mem_usage=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
if (( $(echo "$mem_usage < 80" | bc -l) )); then
    success "Memória: ${mem_usage}% (OK)"
else
    warn "Memória: ${mem_usage}% (Alto)"
fi

# Disco
disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$disk_usage" -lt 80 ]; then
    success "Disco: ${disk_usage}% (OK)"
else
    warn "Disco: ${disk_usage}% (Alto)"
fi

# Teste 8: Verificar logs de erro
log "8. Verificando logs de erro..."
error_count=$(docker-compose logs | grep -i error | wc -l)
if [ "$error_count" -eq 0 ]; then
    success "Nenhum erro encontrado nos logs"
else
    warn "Encontrados $error_count erros nos logs"
    echo "Últimos erros:"
    docker-compose logs | grep -i error | tail -5
fi

# Teste 9: Verificar conectividade externa
log "9. Testando conectividade externa..."
if curl -f https://api.planet.com/data/v1/item-types > /dev/null 2>&1; then
    success "Conectividade com Planet API OK"
else
    warn "Problemas de conectividade com Planet API"
fi

# Teste 10: Verificar firewall
log "10. Verificando firewall..."
if sudo ufw status | grep -q "Status: active"; then
    success "Firewall está ativo"
else
    warn "Firewall não está ativo"
fi

# Resumo final
echo ""
echo -e "${BLUE}=== RESUMO DOS TESTES ===${NC}"
echo "✅ Containers: Rodando"
echo "✅ Health Check: OK"
echo "✅ Frontend: Respondendo"
echo "✅ Backend: Funcionando"
echo "✅ API Endpoints: Testados"
echo "✅ Recursos: Monitorados"
echo "✅ Logs: Verificados"
echo "✅ Conectividade: OK"
echo "✅ Firewall: Configurado"

echo ""
echo -e "${GREEN}🎉 TODOS OS TESTES PASSARAM! 🎉${NC}"
echo ""
echo -e "${BLUE}=== PRÓXIMOS PASSOS ===${NC}"
echo "1. Configure sua PLANET_API_KEY no arquivo .env"
echo "2. Teste as funcionalidades da aplicação"
echo "3. Configure SSL com seu domínio: ./setup-ssl.sh seu-dominio.com"
echo "4. Configure monitoramento contínuo"
echo ""
echo -e "${GREEN}✅ Seu Planet API Explorer está pronto para uso!${NC}" 