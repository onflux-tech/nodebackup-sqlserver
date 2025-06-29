# Guia de Administração - NodeBackup v1.0.0

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Instalação](#instalação)
3. [Configuração Inicial](#configuração-inicial)
4. [Gerenciamento de Backups](#gerenciamento-de-backups)
5. [Sistema de Notificações](#sistema-de-notificações)
6. [Monitoramento](#monitoramento)
7. [Manutenção](#manutenção)
8. [Troubleshooting](#troubleshooting)
9. [Segurança](#segurança)
10. [FAQ](#faq)

## 🎯 Visão Geral

O NodeBackup v1.0.0 é uma solução enterprise-ready para backup automatizado de bancos SQL Server. Esta versão estável oferece:

- ✅ Confiabilidade testada em produção
- ✅ Interface web intuitiva
- ✅ Notificações multi-canal
- ✅ Monitoramento em tempo real
- ✅ Atualizações automáticas

## 🚀 Instalação

### Instalação Rápida

1. **Download**: Baixe o `NodeBackupInstaller.exe` da [última release](https://github.com/seu-repo/releases/latest)

2. **Executar Instalador**:
   ```powershell
   # Instalação padrão
   NodeBackupInstaller.exe
   
   # Instalação silenciosa
   NodeBackupInstaller.exe /S
   ```

3. **Acessar Interface**: Abra `http://localhost:3000` no navegador

### Instalação Manual

1. **Executável Portátil**:
   ```powershell
   # Instalar como serviço
   NodeBackup.exe --install
   
   # Executar manualmente
   NodeBackup.exe
   ```

## 🔧 Configuração Inicial

### Setup Inicial

1. **Primeiro Acesso**:
   - Navegue para `http://localhost:3000`
   - Você será redirecionado para `/setup.html`

2. **Configurar Administrador**:
   - Defina usuário e senha do administrador
   - Guarde essas credenciais com segurança

3. **Configuração SQL Server**:
   ```
   Servidor: localhost\SQLEXPRESS
   Autenticação: Windows (recomendado) ou SQL
   Usuário: sa (se SQL Auth)
   Senha: ****
   ```

### Configurações Essenciais

#### 1. Política de Retenção
- **Modo Clássico**: Sobrescreve backups antigos
- **Modo Retenção**: Mantém histórico com timestamp
- **Recomendado**: Retenção de 7 dias local, 30 dias FTP

#### 2. Agendamento
```javascript
// Exemplos de agendamento
"0 2 * * *"     // Diariamente às 2:00 AM
"0 */6 * * *"   // A cada 6 horas
"0 2 * * 1-5"   // Segunda a Sexta às 2:00 AM
```

#### 3. Armazenamento FTP
```
Host: ftp.exemplo.com
Porta: 21
Usuário: backup_user
Senha: ****
Pasta Remota: /backups/sql
SSL/TLS: Habilitado (recomendado)
```

## 💾 Gerenciamento de Backups

### Seleção de Bancos

1. **Listar Bancos Disponíveis**:
   - Acesse aba "Bancos de Dados"
   - Clique em "Listar Bancos"
   - Selecione os bancos desejados

2. **Excluir Bancos do Sistema**:
   - master, model, msdb, tempdb são ignorados automaticamente

### Execução Manual

```bash
# Via interface web
Dashboard > Executar Backup Agora

# Via linha de comando
NodeBackup.exe --backup-now
```

### Estrutura de Arquivos

```
C:\NodeBackup\
├── backups\
│   ├── Database1_20240120_020000.7z
│   ├── Database2_20240120_020000.7z
│   └── ...
├── logs\
│   ├── app-2024-01-20.log
│   └── ...
└── history.db
```

## 📧 Sistema de Notificações

### Configuração E-mail (SMTP)

1. **Servidores Comuns**:
   ```
   Gmail:
   - Host: smtp.gmail.com
   - Porta: 587
   - Segurança: STARTTLS
   - Senha de App necessária
   
   Outlook/Office365:
   - Host: smtp.office365.com
   - Porta: 587
   - Segurança: STARTTLS
   ```

2. **Teste de Conexão**:
   - Configure SMTP
   - Clique em "Testar Conexão"
   - Verifique diagnóstico

### Configuração WhatsApp (WuzAPI)

1. **Obter Credenciais**:
   - Cadastre-se em [wuzapi.com](https://wuzapi.com)
   - Obtenha URL da API e Token

2. **Configurar**:
   ```
   URL da API: https://api.wuzapi.com/v1
   Token: seu-token-aqui
   Números: +5511999999999, +5511888888888
   ```

3. **Validar**:
   - Teste conexão
   - Envie mensagem teste

### Quando Notificar

- **Sempre**: Recebe todas as notificações
- **Apenas Falhas**: Somente erros
- **Apenas Sucessos**: Somente confirmações
- **Desabilitado**: Sem notificações

## 📊 Monitoramento

### Logs em Tempo Real

1. **Acessar Logs ao Vivo**:
   - Dashboard > Aba "Logs ao Vivo"
   - Monitore execuções em tempo real

2. **Controles**:
   - ⏸️ Pausar/Continuar
   - 🗑️ Limpar logs
   - 💾 Download logs
   - 🔍 Filtrar por nível

### Histórico de Backups

1. **Visualizar Histórico**:
   - Dashboard > Aba "Histórico"
   - Filtros: Todos, Sucessos, Falhas
   - Paginação: 10 registros por página

2. **Estatísticas**:
   - Total de backups
   - Taxa de sucesso
   - Duração média
   - Tamanho total

### Indicadores de Saúde

- 🟢 **Verde**: Sistema operacional
- 🟡 **Amarelo**: Avisos (ex: espaço em disco)
- 🔴 **Vermelho**: Erros críticos

## 🔧 Manutenção

### Limpeza de Arquivos

1. **Automática**:
   - Configurada pela política de retenção
   - Executa após cada backup

2. **Manual**:
   ```bash
   # Via interface
   Configurações > Limpeza Manual > Executar
   
   # Limpar logs antigos
   Dashboard > Logs > Limpar Logs Antigos
   ```

### Backup da Configuração

```powershell
# Fazer backup
copy config.enc config.enc.backup

# Restaurar
copy config.enc.backup config.enc
```

### Atualizações

1. **Automáticas**:
   - Verificação a cada 6 horas
   - Download e instalação transparente
   - Sem interrupção do serviço

2. **Manual**:
   ```bash
   # Verificar atualizações
   Dashboard > Sobre > Verificar Atualizações
   ```

## 🔍 Troubleshooting

### Problemas Comuns

#### 1. Erro de Conexão SQL Server
```sql
-- Verificar serviço SQL
net start MSSQLSERVER

-- Habilitar TCP/IP
SQL Server Configuration Manager > Protocols > Enable TCP/IP
```

#### 2. Falha no Upload FTP
- Verificar credenciais
- Testar conectividade: `telnet ftp.server.com 21`
- Verificar firewall/proxy
- Habilitar modo passivo se necessário

#### 3. Notificações não Enviadas
- **E-mail**: Verificar senha de app (Gmail/Outlook)
- **WhatsApp**: Validar token WuzAPI
- Revisar logs para detalhes

#### 4. Serviço não Inicia
```powershell
# Reinstalar serviço
NodeBackup.exe --uninstall
NodeBackup.exe --install

# Verificar logs
eventvwr.msc > Windows Logs > Application
```

### Logs de Diagnóstico

```powershell
# Localização dos logs
C:\NodeBackup\logs\

# Níveis de log
- error: Erros críticos
- warn: Avisos importantes
- info: Informações gerais
- debug: Detalhes técnicos
```

## 🔒 Segurança

### Boas Práticas

1. **Senhas Fortes**:
   - Mínimo 12 caracteres
   - Combinação de maiúsculas, minúsculas, números e símbolos

2. **Acesso Restrito**:
   ```powershell
   # Restringir acesso local apenas
   netsh http add urlacl url=http://localhost:3000/ user=DOMAIN\user
   ```

3. **Backup Seguro**:
   - Use FTP com SSL/TLS
   - Criptografe backups sensíveis
   - Restrinja acesso aos arquivos

4. **Monitoramento**:
   - Revise logs regularmente
   - Configure alertas para falhas
   - Monitore espaço em disco

### Hardening

```powershell
# Executar com usuário específico
sc config NodeBackup obj= ".\BackupUser" password= "SenhaForte"

# Restringir permissões
icacls "C:\NodeBackup" /grant BackupUser:(OI)(CI)F /T
```

## ❓ FAQ

**P: Posso fazer backup de bancos em servidores remotos?**
R: Sim, configure o servidor remoto nas configurações SQL.

**P: Qual o tamanho máximo de banco suportado?**
R: Não há limite técnico, depende do espaço em disco.

**P: Posso agendar múltiplos horários?**
R: Use expressões cron complexas ou crie tarefas Windows adicionais.

**P: Como migrar para novo servidor?**
R: Copie `config.enc` e `history.db` para o novo servidor.

**P: Suporta SQL Server Express?**
R: Sim, todas as edições do SQL Server 2008 R2+ são suportadas.

**P: Posso customizar os templates de e-mail?**
R: Na v1.0.0 os templates são fixos. Customização planejada para v1.1.0.

## 📞 Suporte

- **Documentação**: `/docs` no repositório
- **Issues**: GitHub Issues para bugs e sugestões
- **Logs**: Sempre inclua logs ao reportar problemas

---

*NodeBackup v1.0.0 - Release Estável* 