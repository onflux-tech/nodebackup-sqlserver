# 🔧 Troubleshooting - Conexão SQL Server no Windows Server

## ⚠️ Configuração Padrão

A aplicação agora está configurada para:
- **Criptografia desabilitada por padrão** (`encrypt: false`)
- **Aceitar qualquer certificado** (`trustServerCertificate: true`)
- **Usar apenas autenticação SQL** (usuário e senha)

Isso garante máxima compatibilidade com diferentes versões do Windows Server e SQL Server.

## 🚨 Problemas Comuns e Soluções

### 1. Erro "socket hang up" ou "ESOCKET"

**Causa:** Problema de comunicação entre cliente e servidor.

**Soluções:**
- Verifique se o SQL Server está configurado para aceitar conexões TCP/IP
- Confirme se o firewall não está bloqueando a conexão
- Teste a conexão usando SQL Server Management Studio

### 2. Erro "Failed to connect to localhost:1433"

**Verificações:**
1. **SQL Server está rodando?**
   ```cmd
   sc query MSSQLSERVER
   # ou para instância nomeada:
   sc query MSSQL$NOMEINSTANCIA
   ```

2. **TCP/IP está habilitado?**
   - Abra SQL Server Configuration Manager
   - SQL Server Network Configuration > Protocols
   - Habilite TCP/IP e reinicie o serviço

3. **Porta correta?**
   - Verifique em SQL Server Configuration Manager
   - TCP/IP Properties > IP Addresses > IPAll > TCP Port

### 3. Erro "Login failed"

**Verificações:**
1. **Autenticação SQL habilitada?**
   - No SQL Server Management Studio
   - Propriedades do servidor > Security
   - Selecione "SQL Server and Windows Authentication mode"

2. **Usuário tem permissões?**
   ```sql
   -- Verificar se usuário existe
   SELECT name FROM sys.sql_logins WHERE name = 'seu_usuario';
   
   -- Criar usuário se necessário
   CREATE LOGIN [seu_usuario] WITH PASSWORD = 'sua_senha';
   
   -- Dar permissões
   ALTER SERVER ROLE sysadmin ADD MEMBER [seu_usuario];
   ```

### 4. Firewall do Windows

**Abrir portas necessárias:**
```powershell
# Porta padrão SQL Server
New-NetFirewallRule -DisplayName "SQL Server" -Direction Inbound -Protocol TCP -LocalPort 1433 -Action Allow

# SQL Server Browser (para instâncias nomeadas)
New-NetFirewallRule -DisplayName "SQL Server Browser" -Direction Inbound -Protocol UDP -LocalPort 1434 -Action Allow
```

### 5. Problemas com Instâncias Nomeadas

**Formato correto:**
- `SERVIDOR\INSTANCIA` (ex: `MYSERVER\SQLEXPRESS`)
- Não use `SERVIDOR:PORTA` para instâncias nomeadas

**Verificar SQL Server Browser:**
```cmd
sc query SQLBrowser
sc start SQLBrowser
```

## 🔍 Diagnóstico Detalhado

### Use o botão "Testar Conexão Detalhada"

A aplicação agora inclui um botão de teste que fornece:
- Versão do SQL Server
- Permissões do usuário
- Detalhes do erro
- Sugestões específicas

### Logs para Verificar

1. **Logs da Aplicação:**
   - Verifique `logs/backup-YYYY-MM-DD.log`
   - Procure por "Erro detalhado de conexão"

2. **Event Viewer do Windows:**
   - Windows Logs > Application
   - Filtrar por Source: MSSQLSERVER

3. **SQL Server Error Log:**
   - Localização padrão: `C:\Program Files\Microsoft SQL Server\MSSQL15.MSSQLSERVER\MSSQL\Log\ERRORLOG`

## 🛠️ Configurações Recomendadas

### Para Windows Server 2012/2016:

1. **Atualizar TLS:**
   - Instale atualizações do Windows
   - Habilite TLS 1.2 no registro

2. **Certificado SQL Server:**
   ```sql
   -- Verificar certificado atual
   SELECT name, certificate_id, pvt_key_encryption_type_desc, 
          issuer_name, subject, expiry_date
   FROM sys.certificates;
   ```

3. **Configuração de Rede:**
   - Use IP estático para o servidor
   - Configure DNS corretamente

### Para Windows Server 2019/2022:

- Geralmente funciona sem problemas
- Verifique apenas firewall e autenticação

## 📝 Checklist de Verificação

- [ ] SQL Server está rodando
- [ ] TCP/IP está habilitado
- [ ] Porta 1433 está aberta no firewall
- [ ] Autenticação SQL está habilitada
- [ ] Usuário tem permissões adequadas
- [ ] Nome do servidor está correto
- [ ] Para instâncias nomeadas: SQL Browser está rodando
- [ ] Certificados estão atualizados (ou app configurado para aceitar antigos)

## 🆘 Suporte Adicional

Se o problema persistir após todas as verificações:

1. Execute o teste de conexão detalhado
2. Copie todas as informações de diagnóstico
3. Verifique os logs em `logs/`
4. Abra uma issue no GitHub com:
   - Versão do Windows Server
   - Versão do SQL Server
   - Mensagem de erro completa
   - Logs relevantes 