# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [1.0.0] - 2025-06-29

### 🎉 Release Estável

#### ✨ Melhorias Gerais
- **Performance**: Otimização do consumo de memória e startup time
- **Estabilidade**: Correções de edge cases e melhorias de robustez
- **Compatibilidade**: Validação completa em Windows 7, 10 e 11
- **Documentação**: Guias completos de uso e troubleshooting
- **Segurança**: Revisão completa de segurança e validações

#### 📊 Funcionalidades Consolidadas
- Sistema completo de backup SQL Server
- Notificações por E-mail (SMTP) e WhatsApp (WuzAPI)
- Logs em tempo real via WebSocket
- Auto-update transparente
- Interface web moderna e responsiva
- Política de retenção configurável
- Histórico completo com estatísticas
- Instalação como serviço Windows

#### 🚀 Pronto para Produção
- Documentação completa para administradores
- Suporte a SQL Server 2008 R2 até 2022
- Executável único autocontido (~85MB)

## [0.5.0] - 2025-06-27

### ✨ Adicionado

- **Sistema de Notificações WhatsApp:** Implementado sistema completo de notificações via WhatsApp usando WuzAPI para alertas automáticos de backup.
- **Configuração WuzAPI:** Interface web para configurar URL da API e token de autenticação com teste de conexão integrado.
- **Gerenciamento de Destinatários:** Sistema para adicionar/remover múltiplos números de telefone com validação automática.
- **Notificações Configuráveis:** Controle detalhado de quando enviar mensagens - apenas em sucessos, apenas em falhas, ou ambos.
- **Diagnóstico WuzAPI:** Sistema de sugestões inteligentes para resolver problemas de configuração WhatsApp com base no tipo de erro.
- **Compatibilidade Node.js 12:** Implementação usando módulos nativos `http`/`https` para manter compatibilidade com o executável pkg.

### 🔧 Modificado

- **Módulo JavaScript:** Adicionado novo módulo `whatsapp.js` (8KB) para gerenciar configurações WuzAPI e envio de mensagens.
- **Interface Principal:** Nova aba "WhatsApp" integrada ao dashboard principal com formulários responsivos similares às notificações email.
- **Integração com Scheduler:** O sistema de agendamento agora dispara notificações WhatsApp automáticas após cada backup conforme configuração.
- **Configuração do Sistema:** Estrutura de configuração expandida para incluir configurações WhatsApp (`config.notifications.whatsapp`).

### 📋 API

- **Novas Rotas WhatsApp:**
  - `GET /api/whatsapp/config` - Obter configurações de WhatsApp
  - `POST /api/whatsapp/config` - Salvar configurações de WhatsApp
  - `POST /api/whatsapp/test-connection` - Testar conexão WuzAPI
  - `POST /api/whatsapp/test-message` - Enviar mensagem de teste

### 🚀 Arquitetura

- **Service WhatsApp:** Novo serviço `src/services/whatsapp.js` com métodos para configuração, teste de conexão e envio de mensagens.
- **Rotas API:** Nova rota `src/api/routes/whatsapp.js` seguindo padrão modular existente.
- **Integração Scheduler:** Notificações WhatsApp integradas ao processo de backup com tratamento de erros independente.

## [0.4.0] - 18-06-2025

### ✨ Adicionado

- **Sistema de Notificações por E-mail:** Implementado sistema completo SMTP para envio automático de notificações de backup com templates HTML responsivos.
- **Configuração SMTP Completa:** Interface web para configurar servidor SMTP (host, porta, SSL/TLS, usuário e senha) com teste de conexão integrado.
- **Notificações Configuráveis:** Controle detalhado de quando enviar e-mails - apenas em sucessos, apenas em falhas, ou ambos.
- **Gerenciamento de Destinatários:** Sistema para adicionar/remover múltiplos destinatários de e-mail com validação automática.
- **Diagnóstico SMTP Avançado:** Sistema de sugestões inteligentes para resolver problemas de configuração SMTP com base no tipo de erro.
- **Dependência nodemailer:** Adicionada biblioteca `nodemailer@6.9.13` para envio de e-mails com compatibilidade Node.js 12.

### 🔧 Modificado

- **Módulo JavaScript:** Adicionado novo módulo `notifications.js` (7KB) para gerenciar configurações SMTP e envio de e-mails.
- **Interface Principal:** Nova aba "Notificações" integrada ao dashboard principal com formulários responsivos.
- **Integração com Scheduler:** O sistema de agendamento agora dispara notificações automáticas após cada backup conforme configuração.
- **Configuração do Sistema:** Estrutura de configuração expandida para incluir configurações de notificação (`config.notifications`).

### 📋 API

- **Novas Rotas de Notificação:**
  - `GET /api/notifications/config` - Obter configurações de notificação
  - `POST /api/notifications/config` - Salvar configurações de notificação
  - `POST /api/notifications/test-smtp` - Testar conexão SMTP
  - `POST /api/notifications/test-email` - Enviar e-mail de teste

## [0.3.1] - 14-06-2025

### ✨ Adicionado

- **Sistema de Auto-Update:** Implementado sistema completo de atualização automática que verifica e instala novas versões diretamente do GitHub.
- **Verificação Automática:** O sistema verifica por atualizações a cada 6 horas automaticamente.
- **Interface de Atualização:** Nova interface visual no dashboard mostrando a versão atual e notificações quando há atualizações disponíveis.
- **Download Inteligente:** Sistema detecta e prioriza o instalador `.exe` quando disponível, com fallback para o executável principal.
- **Instalação Silenciosa:** Instalador NSIS otimizado para modo completamente silencioso (`/S`) sem pop-ups ou interrupções.
- **Gerenciamento de Serviço:** O sistema para automaticamente o serviço Windows antes da atualização e o reinicia após conclusão.
- **Progress Tracking:** Monitoramento em tempo real do progresso de download e instalação.
- **Rollback Automático:** Sistema cria backup do executável atual antes de aplicar atualizações.

### 🔧 Modificado

- **Instalador NSIS:** Completamente otimizado para suportar instalações silenciosas:
  - Detecção automática de modo silencioso
  - Supressão de MessageBox em atualizações
  - Comandos executados via `nsExec` para não mostrar janelas
  - Interface oculta com `ShowInstDetails nevershow`
  - Auto-close ativado em modo silencioso
- **Interface do Dashboard:** Adicionada seção de versão na sidebar com indicadores visuais.
- **Package.json:** Versão incrementada para 0.3.1.

### 🐛 Corrigido

- **Conflito de Arquivo em Uso:** Implementada solução robusta usando PowerShell para substituir executáveis em uso.

### 🔒 Segurança

- **Verificação de Assinatura:** Sistema valida que atualizações vêm do repositório oficial do GitHub.
- **HTTPS Only:** Todos os downloads são feitos através de conexões seguras HTTPS.
- **Backup Automático:** Executável anterior é preservado antes de aplicar atualizações.

### 💄 Melhorado

- **UX de Atualização:** Interface intuitiva com modal detalhado mostrando versão atual vs nova versão.
- **Notificações Visuais:** Toast notifications e badges indicando status de atualização.
- **Transparência Total:** Usuário pode acompanhar todo o processo através da interface.
- **Zero Downtime:** Processo otimizado para minimizar tempo de inatividade do serviço.

## [0.3.0] - 13-06-2025

### ✨ Adicionado

- **Logs em Tempo Real (WebSocket):** Implementado um sistema completo de streaming de logs em tempo real para monitoramento direto da interface web. A nova aba "Logs ao Vivo" permite acompanhar as atividades do servidor, como início de backups, conexões FTP e erros, instantaneamente.
- **Interface de Logs Interativa:** A nova seção de logs inclui controles avançados para pausar/continuar o auto-scroll, limpar a visualização e baixar o log atual como um arquivo de texto.
- **Autenticação WebSocket:** A conexão WebSocket é protegida por autenticação baseada em sessão, garantindo que apenas usuários autenticados possam receber os logs.
- **Sessões Persistentes:** Implementado armazenamento de sessões com SQLite usando `connect-sqlite3` para maior robustez e persistência entre reinicializações do serviço.
- **Módulo logs.js:** Novo módulo JavaScript (3KB) dedicado ao gerenciamento de logs em tempo real com padrões modulares estabelecidos.
- **Arquitetura Modular Completa:** Frontend e backend completamente refatorados em estrutura modular:
  - **CSS Modular:** 5 arquivos especializados (base.css, components.css, layout.css, login.css, responsive.css)
  - **JavaScript Modular:** 9 módulos específicos (ui.js, config.js, database.js, history.js, storage.js, schedule.js, auth.js, api.js, logs.js)
  - **Backend Reorganizado:** Rotas API separadas por funcionalidade com middleware dedicado

### 🔧 Modificado

- **Servidor Express:** O servidor foi estendido para suportar WebSocket com Socket.IO 4.x, mantendo compatibilidade com Node.js 12.
- **Logger Winston:** O sistema de logging foi aprimorado para transmitir logs em tempo real via WebSocket para todos os clientes autenticados.
- **Configuração de Sessões:** Ajustado `saveUninitialized` para `false` e reduzido o tempo de expiração das sessões de 24 horas para 1 hora, aumentando a segurança.
- **Dependências:** Adicionadas as bibliotecas `socket.io` para comunicação em tempo real e `connect-sqlite3` para armazenamento robusto de sessões.
- **Arquitetura Frontend:** Expandida para 9 módulos JavaScript (38KB total) com a adição do módulo de logs em tempo real.
- **Estrutura de Arquivos:** Reorganização completa da estrutura frontend e backend para melhor manutenibilidade e escalabilidade.

### 🐛 Corrigido

- **Flash de Tema Claro (FOUC):** Implementado script inline no `<head>` de todos os arquivos HTML (index.html, login.html, setup.html) para aplicar o tema escuro imediatamente, eliminando o flash indesejado durante o carregamento da página.
- **Gerenciamento de Sessão:** A mudança para `connect-sqlite3` resolve potenciais problemas de perda de sessão ao reiniciar o serviço, proporcionando maior estabilidade.
- **Estabilidade WebSocket:** Implementada reconexão automática e tratamento de erros para garantir comunicação confiável em tempo real.
- **Controles de Interface:** Corrigidos problemas com botões de pausar/continuar e auto-scroll na interface de logs que não funcionavam corretamente.
- **Event Listeners:** Refatorado o sistema de event listeners para prevenir duplicação e melhorar a responsividade dos controles.
- **Aplicação Duplicada de Tema:** Removida aplicação duplicada do tema nos arquivos JavaScript, deixando apenas o script inline otimizado.

### ♻️ Refatorado

- **Estrutura Frontend:** CSS separado em 5 módulos especializados para melhor organização e manutenção.
- **JavaScript Modular:** Script principal dividido em 9 módulos específicos, cada um com responsabilidade bem definida.
- **Rotas API:** Backend reorganizado com rotas separadas por funcionalidade (auth.js, browse.js, config.js, database.js, history.js, storage.js).
- **Middleware de Autenticação:** Criado middleware centralizado para autenticação em todas as rotas protegidas.
- **Padrões de Código:** Estabelecidos padrões modulares consistentes para facilitar manutenção e expansão futura.

### 🔒 Segurança

- **Autenticação WebSocket:** Middleware de autenticação implementado para WebSocket, garantindo que apenas usuários logados possam acessar logs em tempo real.
- **Validação de Sessão:** Verificação contínua de sessões válidas para conexões WebSocket ativas.
- **Rate Limiting:** Proteção contra spam de logs e sobrecarga do servidor WebSocket.
- **Sessões Robustas:** Armazenamento persistente de sessões em SQLite para maior segurança e estabilidade.

### 💄 Melhorado

- **UX de Logs:** Interface mais intuitiva com controles visuais claros para pausar, limpar e baixar logs.
- **Responsividade:** Interface de logs adaptada para dispositivos móveis com controles touch-friendly.
- **Performance:** Otimização do buffer de logs em memória para melhor performance em sessões longas.
- **Debugging:** Logs estruturados facilitam identificação rápida de problemas durante operações de backup.
- **Manutenibilidade:** Arquitetura modular facilita localização e edição de funcionalidades específicas.
- **Escalabilidade:** Base sólida estabelecida para adição rápida de novas funcionalidades.

### 📝 Documentação

- **Regras do Cursor:** Atualizadas completamente todas as regras de desenvolvimento para refletir a nova arquitetura modular.
- **Padrões Modulares:** Documentados padrões de desenvolvimento frontend e backend.
- **Roadmap Atualizado:** Marcada Fase 1.3 como concluída e planejamento da Fase 2.1 (Notificações E-mail).
- **Estrutura Documentada:** Mapeamento completo da nova organização de arquivos e responsabilidades.

## [0.2.2] - 12-06-2025

### 🐛 Corrigido

- **Status de Sucesso Incorreto:** Corrigido um problema onde um backup era marcado como sucesso mesmo com falhas parciais (ex: falha no upload para FTP).
- **Detecção de Falhas no Histórico:** Melhorada a precisão na detecção e exibição dos detalhes da etapa exata onde a falha ocorreu no histórico de backups.

### 💄 Modificado

- **Ícones da Interface:** Atualizados os ícones em várias partes da interface para uma representação visual mais clara e intuitiva das ações.

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

[1.0.0]: https://github.com/onflux-tech/nodebackup-sqlserver/compare/v0.5.0...v1.0.0
[0.5.0]: https://github.com/onflux-tech/nodebackup-sqlserver/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/onflux-tech/nodebackup-sqlserver/compare/v0.3.1...v0.4.0
[0.3.1]: https://github.com/onflux-tech/nodebackup-sqlserver/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/onflux-tech/nodebackup-sqlserver/compare/v0.2.2...v0.3.0
[0.2.2]: https://github.com/onflux-tech/nodebackup-sqlserver/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/onflux-tech/nodebackup-sqlserver/compare/v0.1.0...v0.2.1
[0.1.0]: https://github.com/onflux-tech/nodebackup-sqlserver/compare/v0.0.5...v0.1.0
[0.0.5]: https://github.com/onflux-tech/nodebackup-sqlserver/releases/tag/v0.0.5
