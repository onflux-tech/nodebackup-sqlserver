<div align="center">
<h1>Node-Backup: SQL Server</h1>
</div>

<div align="center">

![🚀 Release](https://github.com/onflux-tech/nodebackup-sqlserver/actions/workflows/release.yml/badge.svg)
[![GitHub release](https://img.shields.io/github/v/release/onflux-tech/nodebackup-sqlserver?style=flat-square&logo=github&label=Release)](https://github.com/onflux-tech/nodebackup-sqlserver/releases/latest)

</div>

Uma solução segura e leve para automatizar backups de bancos de dados SQL Server, com compressão, envio para FTP e com opção de execução como serviço do Windows.

## 🌟 Principais Funcionalidades

- **Setup Inicial Interativo:** Na primeira execução, a aplicação guia você por uma página web segura para criar sua conta de administrador.
- **Interface Web Segura:** Acesso protegido por login e senha, com funcionalidade para alteração de senha.
- **Configuração Criptografada:** Todas as suas credenciais (banco de dados, FTP) são armazenadas em um arquivo `config.enc` seguro.
- **Backups SQL Server:** Gera arquivos `.bak` de múltiplos bancos de dados.
- **Compressão 7-Zip:** Comprime os backups em formato `.7z` com alta taxa de compressão.
- **Upload via FTP:** Envia os backups compactados para um servidor FTP.
- **Agendamento Flexível:** Permite configurar múltiplos horários para backups automáticos.
- **Política de Retenção:** Sistema automático para limpeza de backups antigos com modos "Clássico" e "Retenção".
- **Painel de Histórico:** Visualização completa do histórico de backups com estatísticas e logs detalhados.
- **Interface Moderna:** Design responsivo com tema claro/escuro e suporte móvel.
- **Serviço do Windows:** Roda de forma confiável em segundo plano.

## 📋 Pré-requisitos

- **Sistema Operacional:** Windows 7 ou superior.
- **SQL Server (2008 ou superior):** A ferramenta `sqlcmd` precisa estar instalada e acessível no `PATH` do sistema.
- **Node.js (v12 ou superior):** Necessário apenas se você for modificar ou compilar o projeto.

## 🚀 Como Usar

1.  Baixe o `NodeBackup.exe` da seção de _Releases_ e coloque-o em uma pasta dedicada (ex: `C:\NodeBackup`).
2.  Execute `NodeBackup.exe`. A aplicação iniciará em segundo plano.
3.  Abra seu navegador e acesse `http://localhost:3030`.

### Primeiro Acesso

Na primeira vez que você acessar a interface, será direcionado para uma página de **criação de conta de administrador**. Defina seu usuário e senha. Após salvar, você será levado à tela de login.

### Acessos Futuros

Nos acessos seguintes, você verá a tela de login. Utilize as credenciais que você criou.

### Alterando a Senha

Na tela de login, clique no link **"Alterar senha"** para abrir a janela onde você pode atualizar suas credenciais.

## 👷 Executando como Serviço do Windows

Para que a rotina de backup funcione de forma autônoma, instale-a como um serviço do Windows.

**⚠️ Importante:** Os comandos a seguir devem ser executados em um terminal com **privilégios de administrador**.

1.  Abra o **Prompt de Comando (CMD)** ou **PowerShell** como **administrador**.
2.  Navegue até a pasta onde o `NodeBackup.exe` está localizado (`cd C:\NodeBackup`).
3.  Execute um dos seguintes comandos:

    - **Para instalar o serviço:**
      ```shell
      .\NodeBackup.exe --install
      ```
    - **Para desinstalar o serviço:**
      ```shell
      .\NodeBackup.exe --uninstall
      ```

Após a instalação, o serviço `NodeBackupSQLServer` será iniciado e configurado para inicializar automaticamente com o Windows.

## 🛠️ Build a Partir do Código-Fonte (Opcional)

Se desejar modificar ou compilar o projeto:

1.  Clone o repositório e instale as dependências:
    ```shell
    git clone https://github.com/onflux-tech/nodebackup-sqlserver.git
    cd nodebackup-sqlserver
    npm install
    ```
2.  Para iniciar em modo de desenvolvimento, execute:

    ```shell
    npm start
    ```

    O fluxo de configuração inicial pela interface web é o mesmo da versão compilada.

3.  Para gerar o executável (`NodeBackup.exe`):
    ```shell
    npm run build
    ```

### Criando o Instalador (Opcional)

Para gerar um instalador completo (`NodeBackupInstaller.exe`), siga nosso [**Guia de Build do Instalador**](./docs/BUILD_INSTALLER.md).

## 🤝 Como Contribuir

Contribuições são sempre bem-vindas! Se você tem ideias para melhorar a aplicação, corrigir um bug ou adicionar uma nova funcionalidade, sinta-se à vontade para abrir uma **Issue** ou enviar um **Pull Request**.

## 🗺️ Roadmap de Melhorias

Abaixo estão as funcionalidades planejadas para o futuro. Contribuições são muito bem-vindas!

### ✅ **Fase 1.1: Política de Retenção (v0.1.0)**

- **Status:** Concluído
- **Funcionalidades:** Sistema completo para gerenciar e limpar backups antigos automaticamente, com modos "Clássico" e "Retenção", limpeza manual e automática, e interface web dedicada.

### ✅ **Fase 1.2: Painel de Histórico (v0.2.1)**

- **Status:** Concluído
- **Funcionalidades:** Painel de histórico completo com banco SQLite, estatísticas de backups, filtros por status, interface modernizada com tema claro/escuro, e melhorias de UX/UI.

### 🎯 **Fase 1.3: Logs em Tempo Real (Próximo)**

- [ ] Stream de logs em tempo real via WebSocket
- [ ] Interface "Logs ao Vivo" no dashboard
- [ ] Filtros por nível (info, warn, error)

### Fase 2: Notificações

- [ ] **Alertas por E-mail:** Enviar notificações sobre o status de cada rotina de backup.
- [ ] **Integração com Mensageiros:** Adicionar suporte para alertas via Telegram ou WhatsApp.

### Fase 3: Expansão das Fontes de Backup

- [ ] **Backup de Arquivos e Pastas:** Permitir a seleção de diretórios para incluir no backup.
- [ ] **Suporte a Novos Bancos:** Adicionar compatibilidade com MySQL e PostgreSQL.

### Fase 4: Expansão dos Destinos de Backup

- [ ] **Integração com Storage S3:** Adicionar suporte para upload para serviços S3.
- [ ] **Integração com Google Drive:** Permitir o envio dos backups para o Google Drive.

### Fase 5: Funcionalidades Avançadas

- [ ] **Interface de Restauração:** Criar uma funcionalidade segura para restaurar um banco de dados a partir de um backup.

## 🔧 Solução de Problemas

### Problemas de Conexão no Windows Server

Se você está tendo problemas para conectar ao SQL Server em ambientes Windows Server, consulte o guia completo: [TROUBLESHOOTING-CONNECTION.md](docs/TROUBLESHOOTING-CONNECTION.md)

**Problemas comuns:**

- Erro "socket hang up" em Windows Server 2012/2016
- Falha de autenticação
- SQL Server não encontrado
- Problemas com certificados SSL/TLS

**Novo recurso:** Use o botão "Testar Conexão Detalhada" na interface web para obter diagnósticos completos.

## 📄 Licença

Este projeto está licenciado sob a [Licença MIT](https://github.com/onflux-tech/nodebackup-sqlserver/blob/master/LICENSE).
