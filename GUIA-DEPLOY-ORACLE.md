# 🚀 Guia Completo de Deploy - VPS Oracle ARM Ubuntu 24.04

## 📋 Pré-requisitos

- ✅ VPS Oracle ARM (recomendado: 24GB RAM, 4 vCPUs)
- ✅ Ubuntu 24.04 LTS
- ✅ Acesso SSH com usuário sudo
- ✅ Chave da API da Planet Labs
- ✅ Domínio configurado (opcional, para SSL)

## 🎯 Deploy Rápido (Recomendado)

### 1. Conectar na VPS
```bash
ssh usuario@seu-ip-da-vps
```

### 2. Baixar e Executar Script de Deploy
```bash
# Baixar o script otimizado
wget https://raw.githubusercontent.com/ZeusnetAi/planet-explorer-app/main/deploy-oracle-arm.sh
chmod +x deploy-oracle-arm.sh

# Executar deploy
./deploy-oracle-arm.sh
```

### 3. Configurar API Key (OBRIGATÓRIO)
```bash
cd /opt/planet-explorer
nano .env
```

Editar a linha:
```env
PLANET_API_KEY=SUA_CHAVE_PLANET_AQUI
```

### 4. Reiniciar Serviços
```bash
./maintenance.sh restart
```

## 🔧 Deploy Manual (Passo a Passo)

### 1. Preparar Sistema
```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar dependências
sudo apt install -y curl wget git docker.io docker-compose ufw fail2ban

# Configurar firewall
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
```

### 2. Instalar Docker para ARM64
```bash
# Remover versões antigas
sudo apt remove -y docker docker-engine docker.io containerd runc

# Adicionar repositório oficial
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER

# Iniciar Docker
sudo systemctl start docker
sudo systemctl enable docker
```

### 3. Clonar Projeto
```bash
sudo mkdir -p /opt/planet-explorer
sudo chown $USER:$USER /opt/planet-explorer
cd /opt/planet-explorer
git clone https://github.com/ZeusnetAi/planet-explorer-app.git .
```

### 4. Configurar Variáveis
```bash
cp Backend/env.example .env
nano .env
```

Conteúdo do `.env`:
```env
FLASK_ENV=production
SECRET_KEY=sua-chave-secreta-aqui
PLANET_API_KEY=SUA_CHAVE_PLANET_AQUI
DATABASE_URL=sqlite:///app.db
LOG_LEVEL=INFO
MAX_CONTENT_LENGTH=16777216
WORKERS=2
THREADS=4
```

### 5. Criar Certificados SSL
```bash
sudo mkdir -p ssl
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout ssl/key.pem \
    -out ssl/cert.pem \
    -subj "/C=BR/ST=SP/L=SaoPaulo/O=PlanetExplorer/CN=localhost"
sudo chown -R $USER:$USER ssl
```

### 6. Construir e Iniciar
```bash
docker-compose build --no-cache
docker-compose up -d
```

## 🔒 Configurar SSL com Let's Encrypt

### 1. Configurar Domínio
Configure seu domínio para apontar para o IP da VPS:
```
A    seu-dominio.com    →    IP_DA_VPS
```

### 2. Obter Certificado
```bash
cd /opt/planet-explorer
./setup-ssl.sh seu-dominio.com
```

### 3. Verificar Renovação Automática
```bash
crontab -l
# Deve mostrar: 0 12 * * * cd /opt/planet-explorer && ./setup-ssl.sh > /dev/null 2>&1
```

## 🛠️ Comandos de Manutenção

### Script de Manutenção
```bash
cd /opt/planet-explorer

# Iniciar serviços
./maintenance.sh start

# Parar serviços
./maintenance.sh stop

# Reiniciar serviços
./maintenance.sh restart

# Ver logs
./maintenance.sh logs

# Atualizar aplicação
./maintenance.sh update

# Fazer backup
./maintenance.sh backup

# Ver status
./maintenance.sh status

# Limpar recursos
./maintenance.sh cleanup
```

### Comandos Docker Diretos
```bash
# Ver status dos containers
docker-compose ps

# Ver logs em tempo real
docker-compose logs -f

# Ver logs de um serviço específico
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f nginx

# Reiniciar um serviço
docker-compose restart backend

# Reconstruir e reiniciar
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## 📊 Monitoramento

### Health Check
```bash
curl http://localhost/api/health
```

### Verificar Recursos
```bash
# CPU e Memória
htop

# Espaço em disco
df -h

# Logs do sistema
sudo journalctl -f

# Status do firewall
sudo ufw status

# Monitoramento completo
./monitoring.sh
```

## 🔍 Troubleshooting

### Problemas Comuns

#### 1. Docker não inicia
```bash
sudo systemctl status docker
sudo systemctl start docker
```

#### 2. Containers não iniciam
```bash
docker-compose logs
docker-compose down --remove-orphans
docker-compose up -d
```

#### 3. Erro de permissão
```bash
sudo usermod -aG docker $USER
# Fazer logout e login novamente
```

#### 4. Porta já em uso
```bash
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :443
```

#### 5. SSL não funciona
```bash
# Verificar certificados
ls -la ssl/
# Reconfigurar SSL
./setup-ssl.sh seu-dominio.com
```

### Logs Importantes
```bash
# Logs do backend
docker-compose logs backend

# Logs do nginx
docker-compose logs nginx

# Logs do sistema
sudo journalctl -u docker
```

## 🚀 Otimizações para ARM64

### Configurações do Docker
```bash
# Otimizar para ARM64
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

sudo systemctl restart docker
```

### Configurações do Sistema
```bash
# Otimizar swap
sudo sysctl vm.swappiness=10

# Otimizar TCP
echo 'net.core.rmem_max = 16777216' | sudo tee -a /etc/sysctl.conf
echo 'net.core.wmem_max = 16777216' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## 📈 Backup e Restore

### Backup Automático
```bash
# Backup manual
./maintenance.sh backup

# Configurar backup automático
(crontab -l 2>/dev/null; echo "0 2 * * * cd /opt/planet-explorer && ./maintenance.sh backup") | crontab -
```

### Restore
```bash
# Parar serviços
./maintenance.sh stop

# Restaurar backup
docker-compose exec backend tar -xzf /app/backup-YYYYMMDD_HHMMSS.tar.gz -C /

# Reiniciar serviços
./maintenance.sh start
```

## 🔐 Segurança

### Firewall
```bash
# Verificar status
sudo ufw status

# Adicionar regras específicas
sudo ufw allow from seu-ip/32 to any port 22
```

### Fail2ban
```bash
# Verificar status
sudo systemctl status fail2ban

# Ver logs
sudo tail -f /var/log/fail2ban.log
```

### Atualizações Automáticas
```bash
# Configurar atualizações de segurança
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

## 🌐 Acesso à Aplicação

### URLs de Acesso
- **HTTP**: `http://seu-ip-da-vps`
- **HTTPS**: `https://seu-dominio.com` (após configurar SSL)

### Testes de Funcionalidade
```bash
# Health check
curl http://localhost/api/health

# Teste de API
curl http://localhost/api/basemap/series

# Teste de frontend
curl -I http://localhost
```

## 📞 Suporte

### Informações Úteis
- **Diretório do projeto**: `/opt/planet-explorer`
- **Logs**: `docker-compose logs -f`
- **Configuração**: `nano .env`
- **Status**: `./maintenance.sh status`

### Comandos de Emergência
```bash
# Parar tudo
./maintenance.sh stop

# Reiniciar tudo
./maintenance.sh restart

# Ver logs de erro
docker-compose logs --tail=100
```

---

## ✅ Checklist de Deploy

- [ ] Sistema atualizado
- [ ] Docker instalado e configurado
- [ ] Projeto clonado
- [ ] Variáveis de ambiente configuradas
- [ ] PLANET_API_KEY configurada
- [ ] Containers construídos e iniciados
- [ ] Health check passando
- [ ] Firewall configurado
- [ ] SSL configurado (se aplicável)
- [ ] Backup configurado
- [ ] Monitoramento ativo

**🎉 Seu Planet API Explorer está pronto para uso!** 