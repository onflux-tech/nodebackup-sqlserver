Write-Host "=== Build do Instalador NodeBackup ===" -ForegroundColor Cyan

$nsisPath = @(
  "${env:ProgramFiles(x86)}\NSIS\makensis.exe",
  "${env:ProgramFiles}\NSIS\makensis.exe",
  "C:\Program Files (x86)\NSIS\makensis.exe",
  "C:\Program Files\NSIS\makensis.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $nsisPath) {
  Write-Host "ERRO: NSIS não encontrado!" -ForegroundColor Red
  Write-Host "Por favor, instale o NSIS de: https://nsis.sourceforge.io/Download" -ForegroundColor Yellow
  Write-Host "Ou execute: choco install nsis" -ForegroundColor Yellow
  exit 1
}

Write-Host "NSIS encontrado em: $nsisPath" -ForegroundColor Green

if (-not (Test-Path "NodeBackup.exe")) {
  Write-Host "NodeBackup.exe não encontrado. Compilando..." -ForegroundColor Yellow
  npm run build
  if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: Falha ao compilar NodeBackup.exe" -ForegroundColor Red
    exit 1
  }
}

$requiredFiles = @("NodeBackup.exe", "nssm.exe", "7za.exe", "installer.nsi", "scripts\LICENSE.txt")
$missingFiles = $requiredFiles | Where-Object { -not (Test-Path $_) }

if ($missingFiles) {
  Write-Host "ERRO: Arquivos necessários não encontrados:" -ForegroundColor Red
  $missingFiles | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
  exit 1
}

Write-Host "Compilando instalador..." -ForegroundColor Yellow
& $nsisPath installer.nsi

if ($LASTEXITCODE -eq 0) {
  Write-Host "Instalador criado com sucesso: NodeBackupInstaller.exe" -ForegroundColor Green
  $size = [math]::Round((Get-Item "NodeBackupInstaller.exe").Length / 1MB, 2)
  Write-Host "Tamanho: $size MB" -ForegroundColor Cyan
}
else {
  Write-Host "ERRO: Falha ao criar o instalador" -ForegroundColor Red
  exit 1
} 