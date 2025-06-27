# Notificações WhatsApp - NodeBackup

Esta documentação explica como configurar e usar o sistema de notificações WhatsApp no NodeBackup usando WuzAPI.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Pré-requisitos](#pré-requisitos)
- [Configuração do WuzAPI](#configuração-do-wuzapi)
- [Configuração no NodeBackup](#configuração-no-nodebackup)
- [Testes e Diagnósticos](#testes-e-diagnósticos)
- [Solução de Problemas](#solução-de-problemas)
- [Segurança e Limitações](#segurança-e-limitações)

## 🔍 Visão Geral

O NodeBackup integra-se com WuzAPI para enviar notificações automáticas via WhatsApp sobre o status dos backups. O WuzAPI é uma implementação da biblioteca whatsmeow que permite comunicação direta com os servidores WhatsApp via WebSocket, oferecendo alta performance e baixo consumo de recursos.

### Funcionalidades

- ✅ Notificações automáticas de sucesso/falha de backup
- ✅ Configuração de múltiplos números de telefone
- ✅ Teste de conexão e envio de mensagens
- ✅ Diagnóstico inteligente de problemas
- ✅ Templates personalizáveis de mensagens
- ✅ Suporte HTTP e HTTPS

## 🛠️ Pré-requisitos

### Software Necessário

- **WuzAPI Server**: Servidor WuzAPI rodando e acessível
- **Go Programming Language**: Para compilar o WuzAPI (se necessário)
- **Docker** (opcional): Para execução em container

### Informações Necessárias

- URL do servidor WuzAPI (ex: `http://localhost:8080`)
- Token de usuário para autenticação
- Números de telefone destinatários (formato: `5511999999999`)

## ⚙️ Configuração do WuzAPI

### 1. Download e Instalação

```bash
# Clonar o repositório
git clone https://github.com/asternic/wuzapi.git
cd wuzapi

# Compilar (se necessário)
go build .
```

### 2. Configuração via Docker (Recomendado)

Crie um arquivo `docker-compose.yml`:

```yaml
version: '3.8'
services:
  wuzapi:
    image: asternic/wuzapi:latest
    container_name: wuzapi-server
    ports:
      - "8080:8080"
    environment:
      - WUZAPI_ADMIN_TOKEN=seu_token_admin_aqui
      - TZ=America/Sao_Paulo
    volumes:
      - wuzapi_data:/app/data
    restart: unless-stopped

volumes:
  wuzapi_data:
```

Execute com:

```bash
docker-compose up -d
```

### 3. Configuração Manual

Crie um arquivo `.env` na pasta do WuzAPI:

```env
WUZAPI_ADMIN_TOKEN=seu_token_admin_aqui
TZ=America/Sao_Paulo
```

Execute o servidor:

```bash
./wuzapi
```

### 4. Criação de Usuário

Use o token admin para criar um usuário específico para o NodeBackup:

```bash
curl -X POST http://localhost:8080/admin/users \
  -H "Authorization: seu_token_admin_aqui" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "NodeBackup",
    "token": "nodebackup_token_123",
    "events": "All"
  }'
```

### 5. Conectar WhatsApp

1. Acesse `http://localhost:8080/login?token=nodebackup_token_123`
2. Escaneie o QR Code com seu WhatsApp
3. Aguarde a confirmação de conexão

## 🔧 Configuração no NodeBackup

### 1. Acessar Interface

1. Abra o NodeBackup: `http://localhost:3030`
2. Vá para a aba **"WhatsApp"**

### 2. Configuração Básica

**URL da API**: 
```
http://localhost:8080
```

**Token**: 
```
nodebackup_token_123
```

### 3. Adicionar Destinatários

- Clique em **"Adicionar Número"**
- Digite o número no formato: `5511999999999`
  - `55`: Código do Brasil
  - `11`: DDD
  - `999999999`: Número do telefone

### 4. Configurar Envios

Escolha quando enviar notificações:
- ☑️ **Enviar em caso de sucesso**
- ☑️ **Enviar em caso de falha**

### 5. Testar Configuração

1. **Teste de Conexão**: Verifica se o WuzAPI está acessível
2. **Teste de Mensagem**: Envia uma mensagem de teste

## 🧪 Testes e Diagnósticos

### Teste de Conexão

O botão **"Testar Conexão"** verifica:
- ✅ Conectividade com o servidor WuzAPI
- ✅ Validade do token de autenticação
- ✅ Status da sessão WhatsApp

### Teste de Mensagem

O botão **"Enviar Teste"** envia uma mensagem real para todos os números configurados.

### Diagnóstico Automático

O sistema fornece sugestões automáticas para problemas comuns:

| Erro | Possível Causa | Solução |
|------|---------------|---------|
| `Connection refused` | WuzAPI não está rodando | Verificar se o serviço está ativo |
| `401 Unauthorized` | Token inválido | Verificar token na configuração |
| `Network error` | Problemas de rede | Verificar conectividade |
| `Session not connected` | WhatsApp desconectado | Reescanear QR Code |

## 🔧 Solução de Problemas

### 1. WuzAPI Não Responde

**Verificar Status do Container:**
```bash
docker ps | grep wuzapi
docker logs wuzapi-server
```

**Verificar Conectividade:**
```bash
curl http://localhost:8080/session/status \
  -H "token: nodebackup_token_123"
```

### 2. Sessão WhatsApp Desconectada

1. Acesse: `http://localhost:8080/login?token=nodebackup_token_123`
2. Clique em **"Connect"**
3. Escaneie o novo QR Code
4. Teste novamente no NodeBackup

### 3. Mensagens Não Chegam

**Verificar Número:**
```bash
curl -X POST http://localhost:8080/user/check \
  -H "token: nodebackup_token_123" \
  -H "Content-Type: application/json" \
  -d '{"Phone": ["5511999999999"]}'
```

**Resposta esperada:**
```json
[{"Phone": "5511999999999@s.whatsapp.net", "IsInWhatsapp": true}]
```

### 4. Logs Detalhados

**WuzAPI com Debug:**
```bash
./wuzapi -wadebug=DEBUG -logtype=console -color=true
```

**NodeBackup Logs:**
- Acesse a aba **"Logs ao Vivo"** na interface
- Monitore mensagens de erro durante envios

### 5. Problemas de SSL/HTTPS

Se usar HTTPS no WuzAPI, configure certificados:

```bash
./wuzapi -sslcertificate=cert.pem -sslprivatekey=key.pem
```

## 🔒 Segurança e Limitações

### ⚠️ Aviso Importante

**Usar este software violando os Termos de Serviço do WhatsApp pode resultar no banimento do número:**
- Não use para SPAM
- Não envie mensagens em massa
- Use apenas para notificações legítimas de backup
- Use por sua própria conta e risco

### Boas Práticas

1. **Limite de Envios**: Evite mais de 10-20 mensagens por hora
2. **Números Válidos**: Use apenas números que possuem WhatsApp
3. **Mensagens Relevantes**: Envie apenas notificações importantes
4. **Monitoramento**: Acompanhe logs para detectar problemas

### Segurança

1. **Tokens Seguros**: Use tokens complexos e únicos
2. **Rede Privada**: Mantenha WuzAPI em rede interna
3. **Firewall**: Restrinja acesso às portas necessárias
4. **Backup**: Faça backup dos dados de sessão

### Limitações Técnicas

- Dependente da estabilidade do protocolo WhatsApp
- Requer reconexão periódica (QR Code)
- Limitado pelas políticas do WhatsApp
- Não suporta WhatsApp Business API oficial

## 📚 Referências

- [WuzAPI GitHub](https://github.com/asternic/wuzapi)
- [Whatsmeow Library](https://github.com/tulir/whatsmeow)
- [API Reference](http://localhost:8080/api) (quando WuzAPI estiver rodando)

## 🆘 Suporte

Para problemas específicos do NodeBackup:
1. Verifique os logs na aba "Logs ao Vivo"
2. Use o diagnóstico automático na aba "WhatsApp"
3. Consulte a seção de troubleshooting acima

Para problemas do WuzAPI:
1. Consulte os logs do container/serviço
2. Verifique a documentação oficial
3. Teste endpoints diretamente via curl 