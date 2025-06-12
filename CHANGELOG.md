# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [0.2.1] - 11-06-2025

### ✨ Adicionado

- **Painel de Histórico** - Visualização completa do histórico de backups com banco SQLite
- **Estatísticas de Backups** - Total de backups, sucessos/falhas, duração média e tamanho total
- **Autenticação Aprimorada** - Middleware de autenticação para rotas protegidas
- **Cache Control** - Middleware para prevenir cache de respostas da API

### 🔧 Modificado

- **Interface Modernizada** - Tema claro/escuro, fonte Inter, design responsivo e suporte móvel
- **Interface do Usuário** - Sidebar responsiva, modais aprimorados e navegação mobile

## [0.1.0] - 10-06-2025

### ✨ Adicionado

- **Política de Retenção de Backups** - Sistema completo para gerenciar e limpar backups antigos automaticamente

  - Dois modos de operação: Clássico (sobrescrita) e Retenção (acumulativo com timestamp)
  - Configuração de dias de retenção separada para local e FTP (1-365 dias)
  - Limpeza automática após cada backup (configurável)
  - Interface web completa com nova aba "Política de Retenção"
  - Botões de limpeza manual para execução imediata
  - Parsing inteligente de datas para arquivos locais e FTP
  - Suporte a múltiplos formatos de data FTP
  - Logs detalhados de todas as operações de limpeza

- **Novas APIs REST**

  - `POST /api/cleanup-local` - Executa limpeza manual de backups locais
  - `POST /api/cleanup-ftp` - Executa limpeza manual de backups FTP

- **Documentação**
  - `docs/RETENTION_POLICY.md` - Guia completo da política de retenção
  - Exemplos de configuração para diferentes cenários
  - Troubleshooting detalhado

### 🔧 Modificado

- **Nomenclatura de Backups**

  - Modo Retenção usa timestamp completo: `Cliente-2024-01-15-120000.7z`
  - Modo Clássico mantém numeração original: `Cliente-1.7z`, `Cliente-2.7z`

- **Configuração**

  - Novo objeto `retention` em config.js com campos: enabled, localDays, ftpDays, autoCleanup, mode
  - Valores padrão: 7 dias local, 30 dias FTP, limpeza automática ativada

- **Interface Web**
  - Nova aba "Política de Retenção" no dashboard
  - Validações de formulário aprimoradas
  - Feedback visual melhorado para operações de limpeza

### 🐛 Corrigido

- Limpeza de arquivos .bak órfãos durante processo de backup
- Tratamento de erros melhorado para operações FTP
- Validação de datas para diferentes formatos de servidores FTP

### 🔒 Segurança

- Validações rigorosas para evitar remoção acidental de arquivos
- Logs detalhados de todas as operações de limpeza
- Confirmações e avisos na interface para operações destrutivas

## [0.0.5] - 09-06-2025

### ✨ Versão Inicial

- Setup inicial interativo via web
- Interface web com autenticação segura
- Configuração criptografada (config.enc)
- Backup automático SQL Server (.bak)
- Compressão 7-Zip (.7z)
- Upload FTP automatizado
- Agendamento flexível de backups
- Instalação como serviço Windows
- Sistema de logs rotacionados

---

[0.2.1]: https://github.com/onflux-tech/nodebackup-sqlserver/compare/v0.1.0...v0.2.1
[0.1.0]: https://github.com/onflux-tech/nodebackup-sqlserver/compare/v0.0.5...v0.1.0
[0.0.5]: https://github.com/onflux-tech/nodebackup-sqlserver/releases/tag/v0.0.5
