#!/bin/bash

# Script de Teste para Deploy - VPS Oracle ARM
# Verifica se todos os componentes estão funcionando

set -e

echo "🧪 Testando deploy do Planet API Explorer..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log colorido
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✅ $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️ $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌ $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] ℹ️ $1${NC}"
}

# Contador de testes
TESTS_PASSED=0
TESTS_FAILED=0

# Função para testar
test_function() {
    local test_name="$1"
    local test_command="$2"
    
    echo -n "Testando $test_name... "
    
    if eval "$test_command" > /dev/null 2>&1; then
        log "$test_name"
        ((TESTS_PASSED++))
    else
        error "$test_name"
        ((TESTS_FAILED++))
    fi
}

echo "🔍 Iniciando testes de deploy..."

# Teste 1: Verificar se Docker está rodando
test_function "Docker está rodando" "docker info > /dev/null 2>&1"

# Teste 2: Verificar se containers estão rodando
test_function "Containers estão rodando" "docker-compose ps | grep -q 'Up'"

# Teste 3: Verificar se backend está respondendo
test_function "Backend está respondendo" "curl -f http://localhost/api/health > /dev/null 2>&1"

# Teste 4: Verificar se frontend está acessível
test_function "Frontend está acessível" "curl -f http://localhost > /dev/null 2>&1"

# Teste 5: Verificar se nginx está rodando
test_function "Nginx está rodando" "docker-compose ps nginx | grep -q 'Up'"

# Teste 6: Verificar se arquivo .env existe
test_function "Arquivo .env existe" "test -f .env"

# Teste 7: Verificar se PLANET_API_KEY está configurada
test_function "PLANET_API_KEY está configurada" "grep -q 'PLANET_API_KEY' .env && ! grep -q 'SUA_CHAVE_PLANET_AQUI' .env"

# Teste 8: Verificar se certificados SSL existem
test_function "Certificados SSL existem" "test -f ssl/cert.pem && test -f ssl/key.pem"

# Teste 9: Verificar se firewall está ativo
test_function "Firewall está ativo" "sudo ufw status | grep -q 'Status: active'"

# Teste 10: Verificar se fail2ban está rodando
test_function "Fail2ban está rodando" "sudo systemctl is-active --quiet fail2ban"

# Teste 11: Verificar se API da Planet está funcionando
test_function "API da Planet está funcionando" "curl -f http://localhost/api/basemap/series > /dev/null 2>&1"

# Teste 12: Verificar uso de recursos
info "Verificando uso de recursos..."
echo "📊 Status dos containers:"
docker-compose ps

echo ""
echo "💾 Uso de memória:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"

echo ""
echo "🖥️ Uso de CPU e memória do sistema:"
free -h
echo "CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%"

# Teste 13: Verificar logs recentes
info "Verificando logs recentes..."
echo "📋 Últimas 10 linhas do log do backend:"
docker-compose logs --tail=10 backend

# Teste 14: Verificar conectividade externa
info "Testando conectividade externa..."
PUBLIC_IP=$(curl -s ifconfig.me)
echo "🌐 IP Público: $PUBLIC_IP"

# Teste 15: Verificar se portas estão abertas
test_function "Porta 80 está aberta" "sudo netstat -tulpn | grep -q ':80'"
test_function "Porta 443 está aberta" "sudo netstat -tulpn | grep -q ':443'"

# Resultados finais
echo ""
echo "📊 RESULTADOS DOS TESTES"
echo "========================"
echo "✅ Testes passaram: $TESTS_PASSED"
echo "❌ Testes falharam: $TESTS_FAILED"
echo "📈 Taxa de sucesso: $(( (TESTS_PASSED * 100) / (TESTS_PASSED + TESTS_FAILED) ))%"

if [ $TESTS_FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 TODOS OS TESTES PASSARAM! Seu deploy está funcionando perfeitamente!${NC}"
    echo ""
    echo "🌐 URLs de acesso:"
    echo "   - HTTP: http://$PUBLIC_IP"
    echo "   - Health Check: http://$PUBLIC_IP/api/health"
    echo ""
    echo "🔧 Comandos úteis:"
    echo "   - Status: ./maintenance.sh status"
    echo "   - Logs: ./maintenance.sh logs"
    echo "   - Monitoramento: ./monitoring.sh"
else
    echo ""
    echo -e "${YELLOW}⚠️ ALGUNS TESTES FALHARAM. Verifique os problemas acima.${NC}"
    echo ""
    echo "🔧 Comandos para diagnóstico:"
    echo "   - Logs: docker-compose logs"
    echo "   - Status: docker-compose ps"
    echo "   - Configuração: cat .env"
fi

echo ""
echo "📋 Próximos passos recomendados:"
echo "1. Configure SSL com seu domínio: ./setup-ssl.sh seu-dominio.com"
echo "2. Configure backup automático: crontab -e"
echo "3. Monitore regularmente: ./monitoring.sh"
echo "4. Atualize quando necessário: ./maintenance.sh update" 