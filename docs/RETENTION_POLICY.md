# 📋 Política de Retenção - NodeBackup v0.1.0

## 🎯 Visão Geral

A versão 0.1.0 introduziu a **Política de Retenção de Backups** que permite controlar automaticamente a limpeza de arquivos de backup antigos, tanto no disco local quanto no servidor FTP.

## 🔄 Como Funciona

### Funcionamento da Retenção

- **Nomenclatura:** `Cliente-2024-01-15-120000.7z` (com timestamp completo)
- **Acumulação:** Sistema acumula backups até atingir o limite de dias configurado
- **Limpeza:** Remove automaticamente todos os arquivos `.7z` mais antigos que o período definido
- **Abrangência:** A limpeza afeta **todos os arquivos .7z** no diretório, independente do nome

### Exemplo de Funcionamento

```
Backup 00:00: Cliente-2024-01-15-000000.7z
Backup 12:00: Cliente-2024-01-15-120000.7z
Backup 00:00 (dia seguinte): Cliente-2024-01-16-000000.7z

Com retenção de 7 dias: mantém todos os arquivos dos últimos 7 dias
Com retenção de 1 dia: remove arquivos anteriores a ontem
```

## ⚙️ Configuração

### Através da Interface Web

1. Acesse a seção **"Política de Retenção"**
2. Marque **"Ativar limpeza automática de backups antigos"**
3. Configure **"Retenção Local"**: número de dias para manter backups no disco local
4. Configure **"Retenção FTP"**: número de dias para manter backups no servidor FTP
5. Marque **"Executar limpeza automaticamente após cada backup"** se desejar limpeza automática

### Configuração Manual (config.enc)

```json
{
  "retention": {
    "enabled": true,
    "localDays": 7,
    "ftpDays": 30,
    "autoCleanup": true
  }
}
```

## 🗑️ Funcionamento da Limpeza

### Critérios de Limpeza

- **Arquivos afetados:** Todos os arquivos com extensão `.7z`
- **Critério de data:** Arquivos mais antigos que o período configurado
- **Local:** Remove do diretório `/backups/` da aplicação
- **FTP:** Remove do diretório remoto configurado

### Tipos de Limpeza

#### 🤖 Limpeza Automática

- **Quando:** Executada após cada backup (se habilitada)
- **Local:** Usa o valor configurado em "Retenção Local"
- **FTP:** Usa o valor configurado em "Retenção FTP"
- **Logs:** Registra todos os arquivos removidos

#### 🔧 Limpeza Manual

- **Botões:** "🗑️ Limpar Local" e "🌐 Limpar FTP"
- **Requisitos:** Política de retenção deve estar habilitada
- **Execução:** Imediata, usando os valores configurados

## 📊 Parâmetros de Configuração

| Parâmetro       | Descrição                 | Valor Padrão | Limites        |
| --------------- | ------------------------- | ------------ | -------------- |
| **enabled**     | Ativa/desativa a política | `true`       | `true`/`false` |
| **localDays**   | Dias de retenção local    | `7`          | 1-365 dias     |
| **ftpDays**     | Dias de retenção FTP      | `30`         | 1-365 dias     |
| **autoCleanup** | Limpeza automática        | `true`       | `true`/`false` |

## 🚨 Comportamento da Limpeza

### Determinação da Data do Arquivo

#### Para Arquivos Locais:

1. **Prioridade 1:** Extrai data do nome do arquivo (formato timestamp)
2. **Prioridade 2:** Usa data de modificação do arquivo (mtime)

#### Para Arquivos FTP:

1. **Prioridade 1:** Campo `modifiedAt` do servidor FTP
2. **Prioridade 2:** Campo `rawModifiedAt` (com parsing inteligente de ano)
3. **Prioridade 3:** Campo `date` alternativo
4. **Prioridade 4:** Extrai data do nome do arquivo (formato timestamp)

### Parsing Inteligente de Datas FTP

- **Formato sem ano:** `"Jun 10 17:06"` → assume ano atual (2025)
- **Formatos completos:** `"2024-06-10 17:06:00"` → usa diretamente
- **Fallback:** Se parsing falhar, pula o arquivo (não remove)

## 🛠️ Interface de Limpeza Manual

### Pré-requisitos

- ✅ Política de retenção deve estar **habilitada**
- ✅ Para limpeza FTP: credenciais FTP devem estar **configuradas**

### Botões Disponíveis

- **🗑️ Limpar Local**: Remove backups antigos do disco local
- **🌐 Limpar FTP**: Remove backups antigos do servidor FTP

### Feedback da Interface

- **Sucesso:** `"Limpeza local concluída: 3 arquivo(s) removido(s) (7 dias de retenção)"`
- **Nenhum arquivo:** `"Nenhum backup antigo encontrado para remoção local"`
- **Erro:** Mensagens detalhadas com sugestões de solução

## 📋 Logs e Monitoramento

### Logs de Limpeza Automática

```
[INFO] Iniciando limpeza de backups locais anteriores a 2024-01-08 (7 dias)
[INFO] Encontrados 15 arquivo(s) de backup .7z local
[INFO] Backup antigo removido: Cliente-2024-01-05-120000.7z (45.2 MB, data: 2024-01-05)
[INFO] Limpeza concluída: 3 arquivo(s) removido(s), 0 erro(s)
```

### Logs de Limpeza FTP

```
[INFO] Conectando ao servidor FTP ftp.exemplo.com:21 para limpeza...
[INFO] Encontrados 8 arquivo(s) de backup .7z no FTP
[INFO] Backup FTP antigo removido: Backup-2024-01-03-080000.7z (67.8 MB, data: 2024-01-03)
[INFO] Limpeza FTP concluída: 2 arquivo(s) removido(s), 0 erro(s)
```

## 💡 Recomendações

### Configuração de Retenção

- **Local:** 7-15 dias (balance entre espaço e recuperação rápida)
- **FTP:** 30-90 dias (backup remoto de longo prazo)
- **Automática:** Recomendado manter ativada para gerenciamento contínuo

### Estratégias por Cenário

#### 🏢 Ambiente Corporativo

```json
{
  "localDays": 7,
  "ftpDays": 60,
  "autoCleanup": true
}
```

#### 🏠 Ambiente Doméstico

```json
{
  "localDays": 3,
  "ftpDays": 30,
  "autoCleanup": true
}
```

#### 💾 Espaço Limitado

```json
{
  "localDays": 1,
  "ftpDays": 15,
  "autoCleanup": true
}
```

## 🔧 Troubleshooting

### ❌ "Política de retenção não está habilitada"

**Causa:** Checkbox da política está desmarcada
**Solução:** Ative "Ativar limpeza automática de backups antigos"

### ❌ "Configure o FTP antes de executar a limpeza remota"

**Causa:** Credenciais FTP não configuradas
**Solução:** Configure Host, Usuário e Senha do FTP

### ❌ "Nenhum backup antigo encontrado"

**Causa:** Todos os arquivos estão dentro do período de retenção
**Solução:** Normal - significa que não há arquivos para limpar

### ❌ Erro de conexão FTP

**Causa:** Problemas de rede ou credenciais incorretas
**Solução:** Teste a conexão FTP usando o botão "Testar Conexão"

### ❌ Arquivos não são removidos

**Causa:** Política desabilitada ou arquivos não atendem critérios
**Solução:**

1. Verifique se a política está ativa
2. Confirme os dias de retenção configurados
3. Verifique os logs para detalhes

## ⚠️ Importante

### Segurança

- ⚠️ **A limpeza é irreversível** - arquivos removidos não podem ser recuperados
- ✅ **Teste antes de produção** - use limpeza manual para validar comportamento
- ✅ **Monitore os logs** - acompanhe quais arquivos estão sendo removidos

### Abrangência da Limpeza

- 🎯 **Remove qualquer arquivo .7z** no diretório, independente do nome
- 🎯 **Não faz distinção** por cliente ou prefixo do arquivo
- 🎯 **Baseada apenas na data** do arquivo e extensão .7z

