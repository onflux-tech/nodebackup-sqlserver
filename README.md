# ✨ Node-Backup: Backup Automatizado de SQL Server

Uma solução segura e leve para automatizar backups de bancos de dados SQL Server, com compressão, envio para FTP e com opção de execução como serviço do Windows.

## 🌟 Principais Funcionalidades

-   **Setup Inicial Interativo:** Na primeira execução, a aplicação guia você por uma página web segura para criar sua conta de administrador.
-   **Interface Web Segura:** Acesso protegido por login e senha, com funcionalidade para alteração de senha.
-   **Configuração Criptografada:** Todas as suas credenciais (banco de dados, FTP) são armazenadas em um arquivo `config.enc` seguro.
-   **Backups SQL Server:** Gera arquivos `.bak` de múltiplos bancos de dados.
-   **Compressão 7-Zip:** Comprime os backups em formato `.7z` com alta taxa de compressão.
-   **Upload via FTP:** Envia os backups compactados para um servidor FTP.
-   **Agendamento Flexível:** Permite configurar múltiplos horários para backups automáticos.
-   **Serviço do Windows:** Roda de forma confiável em segundo plano.

## 📋 Pré-requisitos

-   **Sistema Operacional:** Windows 7 ou superior.
-   **SQL Server (2008 ou superior):** A ferramenta `sqlcmd` precisa estar instalada e acessível no `PATH` do sistema.
-   **Node.js (v12 ou superior):** Necessário apenas se você for modificar ou compilar o projeto.

## 🚀 Como Usar

1.  Baixe o `NodeBackup.exe` da seção de *Releases* e coloque-o em uma pasta dedicada (ex: `C:\NodeBackup`).
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

    -   **Para instalar o serviço:**
        ```shell
        .\NodeBackup.exe --install
        ```
    -   **Para desinstalar o serviço:**
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

## 🤝 Como Contribuir

Contribuições são sempre bem-vindas! Se você tem ideias para melhorar a aplicação, corrigir um bug ou adicionar uma nova funcionalidade, sinta-se à vontade para abrir uma **Issue** ou enviar um **Pull Request**.

## 📄 Licença

Este projeto está licenciado sob a [Licença MIT](https://github.com/onflux-tech/nodebackup-sqlserver/blob/master/LICENSE). 