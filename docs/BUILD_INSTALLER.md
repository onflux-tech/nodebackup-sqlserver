# Guia de Build do Instalador NodeBackup

## Visão Geral

O NodeBackup utiliza NSIS (Nullsoft Scriptable Install System) para criar um instalador profissional que:

- ✅ Instala o NodeBackup em `Program Files`
- ✅ Oferece opção de instalar como Serviço do Windows
- ✅ Cria atalhos no Menu Iniciar
- ✅ Registra no Painel de Controle para desinstalação
- ✅ Inclui desinstalador completo

## Pré-requisitos

1. **Node.js v12** (para compatibilidade com pkg)
2. **NSIS** - Baixe de [nsis.sourceforge.io](https://nsis.sourceforge.io/Download)

   Ou instale via Chocolatey:

   ```powershell
   choco install nsis
   ```

## Build Local

### 1. Compilar o executável principal

```bash
npm run build
```

### 2. Compilar o instalador

```bash
npm run build:installer
```

Ou manualmente:

```bash
makensis installer.nsi
```

## CI/CD Automático

O GitHub Actions compila automaticamente o instalador quando uma release é publicada:

1. Crie uma nova release no GitHub
2. O workflow irá:
   - Compilar `NodeBackup.exe`
   - Criar `NodeBackupInstaller.exe`
   - Anexar ambos os arquivos à release

## Estrutura do Instalador

```
NodeBackupInstaller.exe
├── Interface gráfica moderna
├── Página de boas-vindas
├── Licença de uso
├── Seleção de diretório
├── Opção de instalação como serviço
├── Progresso de instalação
└── Página de conclusão
```

## Arquivos Incluídos

- `NodeBackup.exe` - Aplicação principal
- `nssm.exe` - Gerenciador de serviços
- `7za.exe` - Utilitário de compressão
- `public/` - Interface web

## Personalização

Para personalizar o instalador, edite `installer.nsi`:

- **Nome**: Linha 8
- **Ícone**: Linhas 20-21
- **Diretório padrão**: Linha 10
- **Textos**: Seção de idiomas

## Troubleshooting

### NSIS não encontrado

```powershell
# Adicione ao PATH manualmente
$env:Path += ";C:\Program Files (x86)\NSIS"
```

### Erro de permissão

Execute o PowerShell como Administrador ou:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Arquivo não encontrado

Certifique-se de que todos os arquivos necessários existem:

- `NodeBackup.exe`
- `nssm.exe`
- `7za.exe`
- `scripts/LICENSE.txt`
- `public/`
