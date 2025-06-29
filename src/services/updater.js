const fs = require('fs');
const path = require('path');
const https = require('https');
const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const logger = require('../utils/logger');
const packageJson = require('../../package.json');

const execAsync = promisify(exec);

class UpdaterService {
  constructor() {
    this.currentVersion = packageJson.version;
    this.githubRepo = 'onflux-tech/nodebackup-sqlserver';
    this.serviceName = 'NodeBackupSQLServer';
    this.updateInProgress = false;
    this.statusFile = path.join(process.cwd(), 'update-status.json');
    this.updateProgress = {
      status: 'idle',
      message: '',
      percentage: 0
    };
  }

  async checkForUpdates() {
    try {
      logger.info('Verificando atualizações disponíveis...');

      const latestRelease = await this.getLatestRelease();

      if (!latestRelease) {
        logger.warn('Não foi possível obter informações da release mais recente');
        return {
          updateAvailable: false,
          currentVersion: this.currentVersion,
          error: 'Não foi possível verificar atualizações'
        };
      }

      const latestVersion = latestRelease.tag_name.replace('v', '');
      const updateAvailable = this.isNewerVersion(latestVersion, this.currentVersion);

      const exeAsset = latestRelease.assets.find(a =>
        a.name === 'NodeBackup.exe' ||
        a.name.toLowerCase().includes('nodebackup') && a.name.endsWith('.exe') && !a.name.includes('installer')
      );

      const installerAsset = latestRelease.assets.find(a =>
        a.name.toLowerCase().includes('installer') && a.name.endsWith('.exe')
      );

      const downloadUrl = exeAsset ? exeAsset.browser_download_url :
        (installerAsset ? installerAsset.browser_download_url : null);

      logger.info(`Versão atual: ${this.currentVersion}, Última versão: ${latestVersion}, Atualização disponível: ${updateAvailable}`);

      return {
        updateAvailable,
        currentVersion: this.currentVersion,
        latestVersion,
        releaseNotes: latestRelease.body,
        downloadUrl,
        downloadType: exeAsset ? 'direct' : 'installer',
        publishedAt: latestRelease.published_at
      };
    } catch (error) {
      logger.error('Erro ao verificar atualizações:', error);
      return {
        updateAvailable: false,
        currentVersion: this.currentVersion,
        error: error.message
      };
    }
  }

  async getLatestRelease() {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.github.com',
        path: `/repos/${this.githubRepo}/releases/latest`,
        headers: {
          'User-Agent': 'NodeBackup-Updater',
          'Accept': 'application/vnd.github.v3+json'
        }
      };

      https.get(options, (res) => {
        let data = '';

        if (res.statusCode !== 200) {
          reject(new Error(`Erro HTTP ${res.statusCode}: ${res.statusMessage}`));
          return;
        }

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const release = JSON.parse(data);
            resolve(release);
          } catch (error) {
            reject(new Error(`Erro ao parsear resposta do GitHub: ${error.message}`));
          }
        });
      }).on('error', (error) => {
        reject(new Error(`Erro de conexão com GitHub: ${error.message}`));
      });
    });
  }

  isNewerVersion(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < 3; i++) {
      if (parts1[i] > parts2[i]) return true;
      if (parts1[i] < parts2[i]) return false;
    }

    return false;
  }

  async performUpdate(downloadUrl, downloadType = 'direct') {
    if (this.updateInProgress) {
      throw new Error('Atualização já em andamento');
    }

    if (!downloadUrl) {
      throw new Error('URL de download não disponível');
    }

    this.updateInProgress = true;
    this.updateStatus('starting', 'Iniciando atualização...', 0);

    try {
      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      this.updateStatus('downloading', 'Baixando nova versão...', 10);
      const downloadPath = path.join(tempDir, downloadType === 'installer' ? 'NodeBackupInstaller-update.exe' : 'NodeBackup-new.exe');

      await this.downloadFile(downloadUrl, downloadPath);

      if (downloadType === 'installer') {
        return await this.performInstallerUpdate(downloadPath);
      }

      this.updateStatus('preparing', 'Preparando atualização...', 50);

      const updateScript = this.createUpdateScript(downloadPath);
      const scriptPath = path.join(tempDir, 'update.bat');

      fs.writeFileSync(scriptPath, updateScript);
      logger.info('Script de atualização criado:', scriptPath);

      this.updateStatus('updating', 'Aplicando atualização...', 60);

      const updateProcess = spawn('cmd.exe', ['/c', 'start', '/min', scriptPath], {
        detached: true,
        stdio: 'ignore',
        shell: false
      });

      updateProcess.unref();

      logger.info('Processo de atualização iniciado. O serviço será reiniciado automaticamente.');

      return {
        success: true,
        message: 'Atualização iniciada. O serviço será reiniciado em breve.'
      };

    } catch (error) {
      this.updateStatus('error', error.message, 0);
      logger.error('Erro durante atualização:', error);
      throw error;
    } finally {
      this.updateInProgress = false;
    }
  }

  async performInstallerUpdate(installerPath) {
    try {
      this.updateStatus('stopping-service', 'Parando serviço para atualização...', 50);

      await execAsync(`sc stop ${this.serviceName}`);
      await this.waitForServiceStatus('STOPPED', 10000);

      this.updateStatus('installing', 'Instalando atualização...', 60);

      const { stdout, stderr } = await execAsync(`"${installerPath}" /S`);

      if (stderr) {
        logger.warn('Avisos do instalador:', stderr);
      }

      await new Promise(resolve => setTimeout(resolve, 3000));

      this.updateStatus('restarting-service', 'Reiniciando serviço...', 80);

      await execAsync(`sc start ${this.serviceName}`);
      await this.waitForServiceStatus('RUNNING', 15000);

      this.updateStatus('completed', 'Atualização concluída!', 100);

      setTimeout(() => {
        try {
          fs.unlinkSync(installerPath);
        } catch (error) {
          logger.warn('Não foi possível remover arquivo temporário:', error.message);
        }
      }, 5000);

      return {
        success: true,
        message: 'Atualização concluída com sucesso. O serviço foi reiniciado.'
      };
    } catch (error) {
      this.updateStatus('error', error.message, 0);
      throw error;
    }
  }

  createUpdateScript(newExePath) {
    const currentExe = process.execPath;
    const backupExe = currentExe + '.backup';
    const tempStatusFile = path.join(path.dirname(this.statusFile), 'temp-update-status.json');

    return `@echo off
setlocal enabledelayedexpansion

:: Aguardar o processo principal encerrar
echo Aguardando NodeBackup encerrar...
timeout /t 3 /nobreak > nul

:: Atualizar status
echo {"status":"stopping-service","message":"Parando servico...","percentage":20} > "${tempStatusFile}"

:: Parar o serviço
echo Parando servico NodeBackupSQLServer...
sc stop NodeBackupSQLServer > nul 2>&1
timeout /t 5 /nobreak > nul

:: Verificar se o serviço parou
:check_service
sc query NodeBackupSQLServer | find "STOPPED" > nul
if errorlevel 1 (
    timeout /t 2 /nobreak > nul
    goto check_service
)

:: Atualizar status
echo {"status":"backing-up","message":"Criando backup...","percentage":40} > "${tempStatusFile}"

:: Fazer backup do executável atual
echo Fazendo backup do executavel atual...
copy /Y "${currentExe}" "${backupExe}" > nul 2>&1
if errorlevel 1 (
    echo Erro ao criar backup
    echo {"status":"error","message":"Erro ao criar backup","percentage":0} > "${tempStatusFile}"
    exit /b 1
)

:: Atualizar status
echo {"status":"updating-files","message":"Substituindo arquivos...","percentage":60} > "${tempStatusFile}"

:: Tentar substituir o executável
echo Substituindo executavel...
:retry_copy
copy /Y "${newExePath}" "${currentExe}" > nul 2>&1
if errorlevel 1 (
    :: Aguardar e tentar novamente
    timeout /t 2 /nobreak > nul
    goto retry_copy
)

:: Atualizar status
echo {"status":"restarting-service","message":"Reiniciando servico...","percentage":80} > "${tempStatusFile}"

:: Reiniciar o serviço
echo Reiniciando servico...
sc start NodeBackupSQLServer > nul 2>&1

:: Aguardar o serviço iniciar
timeout /t 5 /nobreak > nul

:: Verificar se o serviço iniciou
sc query NodeBackupSQLServer | find "RUNNING" > nul
if errorlevel 1 (
    :: Tentar restaurar backup se falhou
    echo Erro ao iniciar servico, restaurando backup...
    echo {"status":"error","message":"Restaurando versao anterior...","percentage":90} > "${tempStatusFile}"
    copy /Y "${backupExe}" "${currentExe}" > nul 2>&1
    sc start NodeBackupSQLServer > nul 2>&1
    echo {"status":"error","message":"Falha na atualizacao, versao anterior restaurada","percentage":0} > "${tempStatusFile}"
) else (
    :: Sucesso
    echo {"status":"completed","message":"Atualizacao concluida com sucesso!","percentage":100} > "${tempStatusFile}"
    
    :: Limpar arquivos temporários após sucesso
    timeout /t 5 /nobreak > nul
    del /Q "${backupExe}" > nul 2>&1
    del /Q "${newExePath}" > nul 2>&1
)

:: Copiar status final para arquivo principal
copy /Y "${tempStatusFile}" "${this.statusFile}" > nul 2>&1
del /Q "${tempStatusFile}" > nul 2>&1

:: Auto-deletar este script
(goto) 2>nul & del "%~f0"
`;
  }

  updateStatus(status, message, percentage) {
    this.updateProgress = { status, message, percentage };

    try {
      fs.writeFileSync(this.statusFile, JSON.stringify(this.updateProgress));
    } catch (error) {
      logger.warn('Não foi possível salvar status de atualização:', error.message);
    }
  }

  getUpdateProgress() {
    try {
      if (fs.existsSync(this.statusFile)) {
        const fileContent = fs.readFileSync(this.statusFile, 'utf8');
        const fileStatus = JSON.parse(fileContent);

        if (fileStatus.status !== 'idle' || this.updateProgress.status === 'idle') {
          this.updateProgress = fileStatus;
        }
      }
    } catch (error) {
    }

    return this.updateProgress;
  }

  async waitForServiceStatus(expectedStatus, timeoutMs = 10000) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      try {
        const { stdout } = await execAsync(`sc query ${this.serviceName}`);

        if (expectedStatus === 'RUNNING' && stdout.includes('RUNNING')) {
          return true;
        } else if (expectedStatus === 'STOPPED' && (stdout.includes('STOPPED') || stdout.includes('STOP_PENDING'))) {
          return true;
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        if (expectedStatus === 'STOPPED') {
          return true;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    throw new Error(`Timeout aguardando serviço ficar ${expectedStatus}`);
  }

  async downloadFile(url, destination) {
    return new Promise((resolve, reject) => {
      const request = (downloadUrl) => {
        https.get(downloadUrl, (response) => {
          if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
            request(response.headers.location);
            return;
          }

          if (response.statusCode !== 200) {
            reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
            return;
          }

          const file = fs.createWriteStream(destination);
          let downloadedSize = 0;
          const totalSize = parseInt(response.headers['content-length'], 10);

          response.on('data', (chunk) => {
            downloadedSize += chunk.length;
            if (totalSize > 0) {
              const percentage = Math.round((downloadedSize / totalSize) * 100);
              const downloadedMB = (downloadedSize / 1024 / 1024).toFixed(1);
              const totalMB = (totalSize / 1024 / 1024).toFixed(1);

              this.updateStatus(
                'downloading',
                `Baixando nova versão... ${downloadedMB}MB / ${totalMB}MB`,
                10 + Math.round(percentage * 0.4)
              );
            }
          });

          response.pipe(file);

          file.on('finish', () => {
            file.close(resolve);
          });
          
          file.on('error', (err) => {
            fs.unlink(destination, () => reject(err));
          });

        }).on('error', (err) => {
          reject(err);
        });
      };
      request(url);
    });
  }

  cleanupStatusFiles() {
    try {
      if (fs.existsSync(this.statusFile)) {
        const stats = fs.statSync(this.statusFile);
        const hoursSinceModified = (Date.now() - stats.mtime) / (1000 * 60 * 60);

        if (hoursSinceModified > 1) {
          fs.unlinkSync(this.statusFile);
          logger.info('Arquivo de status antigo removido');
        }
      }
    } catch (error) {
    }
  }
}

const updaterService = new UpdaterService();
updaterService.cleanupStatusFiles();

module.exports = updaterService; 