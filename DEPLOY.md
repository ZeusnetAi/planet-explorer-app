# 🚀 Deploy Planet API Explorer - VPS Oracle ARM

Este guia fornece instruções completas para hospedar o Planet API Explorer em uma VPS Oracle ARM (24GB RAM, 4 vCPUs).

## 📋 Pré-requisitos

- VPS Oracle ARM (recomendado: 24GB RAM, 4 vCPUs)
- Ubuntu 20.04+ ou Oracle Linux 8+
- Acesso SSH com usuário sudo
- Domínio configurado (opcional, para SSL)

## 🎯 Estratégia de Deploy

### Arquitetura
```
Internet → Nginx (Proxy Reverso) → Frontend React + Backend Flask
```

### Componentes
- **Nginx**: Proxy reverso, SSL, cache, rate limiting
- **Frontend**: React build servido pelo Nginx
- **Backend**: Flask + Gunicorn em container
- **Docker**: Orquestração de todos os serviços

## 🚀 Deploy Automático (Recomendado)

### 1. Conectar na VPS
```bash
ssh usuario@seu-ip-da-vps
```

### 2. Executar Script de Deploy
```bash
# Baixar o script
wget https://raw.githubusercontent.com/ZeusnetAi/planet-explorer-app/main/deploy.sh
chmod +x deploy.sh

# Executar deploy
./deploy.sh
```

### 3. Configurar API Key
```bash
cd /opt/planet-explorer
nano .env
# Editar PLANET_API_KEY com sua chave real
```

### 4. Reiniciar Serviços
```bash
./maintenance.sh restart
```

## 🔧 Deploy Manual

### 1. Preparar Sistema
```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar dependências
sudo apt install -y curl wget git docker.io docker-compose ufw

# Configurar firewall
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
```

### 2. Clonar Projeto
```bash
sudo mkdir -p /opt/planet-explorer
sudo chown $USER:$USER /opt/planet-explorer
cd /opt/planet-explorer
git clone https://github.com/ZeusnetAi/planet-explorer-app.git .
```

### 3. Configurar Variáveis
```bash
cp Backend/env.example .env
nano .env
```

Editar `.env`:
```env
FLASK_ENV=production
SECRET_KEY=sua-chave-secreta-aqui
PLANET_API_KEY=SUA_CHAVE_PLANET_AQUI
DATABASE_URL=sqlite:///app.db
LOG_LEVEL=INFO
```

### 4. Criar Certificados SSL
```bash
sudo mkdir -p ssl
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout ssl/key.pem \
    -out ssl/cert.pem \
    -subj "/C=BR/ST=SP/L=SaoPaulo/O=PlanetExplorer/CN=localhost"
sudo chown -R $USER:$USER ssl
```

### 5. Construir e Iniciar
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
```

## 🔍 Troubleshooting

### Problemas Comuns

#### 1. Container não inicia
```bash
# Ver logs detalhados
docker-compose logs backend

# Verificar se a API key está configurada
cat .env | grep PLANET_API_KEY
```

#### 2. Erro de permissão
```bash
# Corrigir permissões
sudo chown -R $USER:$USER /opt/planet-explorer
chmod +x *.sh
```

#### 3. Porta já em uso
```bash
# Verificar portas em uso
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :443

# Parar serviços conflitantes
sudo systemctl stop apache2 nginx
```

#### 4. SSL não funciona
```bash
# Verificar certificados
ls -la ssl/

# Testar certificado
openssl x509 -in ssl/cert.pem -text -noout

# Regerar certificados
sudo rm ssl/*
# Executar setup-ssl.sh novamente
```

### Logs Importantes
```bash
# Logs do Nginx
docker-compose logs nginx

# Logs do Backend
docker-compose logs backend

# Logs do Frontend
docker-compose logs frontend

# Logs do sistema
sudo journalctl -u docker
```

## 📈 Otimizações

### Performance
- **Nginx**: Configurado com gzip, cache e rate limiting
- **Gunicorn**: 4 workers para melhor concorrência
- **Docker**: Volumes persistentes para dados

### Segurança
- **Firewall**: UFW configurado
- **SSL**: Certificados Let's Encrypt
- **Headers**: Security headers no Nginx
- **Rate Limiting**: Proteção contra DDoS

### Backup
```bash
# Backup automático diário
echo "0 2 * * * cd /opt/planet-explorer && ./maintenance.sh backup" | crontab -
```

## 🌐 Acesso à Aplicação

### URLs
- **HTTP**: http://seu-ip-ou-dominio
- **HTTPS**: https://seu-ip-ou-dominio (após configurar SSL)
- **Health Check**: http://seu-ip-ou-dominio/api/health

### Portas
- **80**: HTTP (redireciona para HTTPS)
- **443**: HTTPS
- **22**: SSH

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs: `./maintenance.sh logs`
2. Teste o health check: `curl http://localhost/api/health`
3. Verifique recursos: `htop`, `df -h`
4. Consulte este documento
5. Abra uma issue no GitHub

## 🎉 Próximos Passos

Após o deploy bem-sucedido:

1. ✅ Configure sua PLANET_API_KEY
2. ✅ Teste todas as funcionalidades
3. ✅ Configure SSL com seu domínio
4. ✅ Configure monitoramento
5. ✅ Faça backup inicial
6. ✅ Documente configurações específicas

**Seu Planet API Explorer está pronto para produção! 🚀** 