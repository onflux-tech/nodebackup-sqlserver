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

      this.updateStatus('preparing', 'Preparando para aplicar a atualização...', 40);

      const updateScript = this.createUpdateScript(downloadPath, downloadType);
      const scriptPath = path.join(tempDir, 'update.bat');

      fs.writeFileSync(scriptPath, updateScript);
      logger.info('Script de atualização unificado criado: ' + scriptPath);

      this.updateStatus('updating', 'Iniciando script de atualização...', 50);

      const updateProcess = spawn('cmd.exe', ['/c', 'start', '""', '/min', scriptPath], {
        detached: true,
        stdio: 'ignore',
        shell: false
      });
      updateProcess.unref();

      logger.info('Processo de atualização iniciado. A aplicação será encerrada pelo script para permitir a substituição dos arquivos.');

      return {
        success: true,
        message: 'Atualização iniciada. O serviço será reiniciado em breve.'
      };
    } catch (error) {
      this.updateStatus('error', error.message, 0);
      logger.error('Erro durante o início da atualização:', error);
      throw error;
    } finally {
      this.updateInProgress = false;
    }
  }

  createUpdateScript(updateFilePath, updateType) {
    const serviceName = this.serviceName;
    const statusFile = this.statusFile;

    const updateCommand = updateType === 'installer'
      ? `start /wait "" "${updateFilePath}" /S`
      : `copy /Y "${updateFilePath}" "${process.execPath}"`;

    const script = [
      '@echo off',
      'chcp 65001 > nul',
      'timeout /t 3 > nul',
      '',
      `echo {"status":"stopping-service","message":"Parando o servico...","percentage":60} > "${statusFile}"`,
      `sc stop ${serviceName}`,
      'timeout /t 5 > nul',
      '',
      updateCommand,
      '',
      `echo {"status":"restarting-service","message":"Reiniciando o servico...","percentage":80} > "${statusFile}"`,
      `sc start ${serviceName}`,
      'timeout /t 5 > nul',
      '',
      `sc query ${serviceName} | find "RUNNING" > nul`,
      'if errorlevel 1 (',
      `    echo {"status":"error","message":"Falha ao reiniciar o servico apos a atualizacao.","percentage":0} > "${statusFile}"`,
      ') else (',
      `    echo {"status":"completed","message":"Atualizacao concluida com sucesso!","percentage":100} > "${statusFile}"`,
      ')',
      '',
      `del /Q "${updateFilePath}" > nul 2>&1`,
      '(goto) 2>nul & del "%~f0"'
    ].join('\\r\\n');

    return script;
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