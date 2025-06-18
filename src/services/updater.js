const fs = require('fs');
const path = require('path');
const https = require('https');
const { exec } = require('child_process');
const { promisify } = require('util');
const logger = require('../utils/logger');
const packageJson = require('../../package.json');

const execAsync = promisify(exec);

class UpdaterService {
  constructor() {
    this.currentVersion = packageJson.version;
    this.githubRepo = 'onflux-tech/nodebackup-sqlserver';
    this.updateInProgress = false;
    this.updateProgress = {
      status: 'idle',
      message: '',
      percentage: 0
    };
  }

  async checkForUpdates() {
    try {

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

      const installerUrl = this.getInstallerUrl(latestRelease);

      return {
        updateAvailable,
        currentVersion: this.currentVersion,
        latestVersion,
        releaseNotes: latestRelease.body,
        downloadUrl: installerUrl,
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

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const release = JSON.parse(data);
            resolve(release);
          } catch (error) {
            reject(new Error('Erro ao parsear resposta do GitHub'));
          }
        });
      }).on('error', reject);
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

  getInstallerUrl(release) {
    const installer = release.assets.find(a =>
      a.name.startsWith('NodeBackupInstaller') && a.name.endsWith('.exe')
    );

    if (!installer) {
      return null;
    }

    return installer.browser_download_url;
  }

  async performUpdate(downloadUrl) {
    if (this.updateInProgress) {
      throw new Error('Atualização já em andamento');
    }

    if (!downloadUrl) {
      throw new Error('URL do instalador não disponível');
    }

    this.updateInProgress = true;
    this.updateProgress = { status: 'starting', message: 'Iniciando atualização...', percentage: 0 };

    try {
      this.updateProgress = { status: 'downloading', message: 'Baixando nova versão...', percentage: 10 };
      const installerPath = path.join(process.cwd(), 'temp', 'NodeBackupInstaller-update.exe');

      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      await this.downloadFile(downloadUrl, installerPath);

      this.updateProgress = { status: 'installing', message: 'Instalando atualização...', percentage: 60 };

      const { stdout, stderr } = await execAsync(`"${installerPath}" /S`);

      if (stderr) {
        logger.warn('Avisos do instalador:', stderr);
      }

      this.updateProgress = { status: 'cleaning', message: 'Finalizando...', percentage: 90 };
      setTimeout(async () => {
        try {
          await fs.promises.unlink(installerPath);
        } catch (error) {
          logger.warn('Não foi possível remover arquivo temporário:', error.message);
        }
      }, 5000);

      this.updateProgress = { status: 'completed', message: 'Atualização concluída!', percentage: 100 };

      return {
        success: true,
        message: 'Atualização concluída com sucesso. A aplicação foi reiniciada.'
      };
    } catch (error) {
      this.updateProgress = { status: 'error', message: error.message, percentage: 0 };
      logger.error('Erro durante atualização:', error);
      throw error;
    } finally {
      this.updateInProgress = false;
    }
  }

  async downloadFile(url, destination) {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(destination);

      https.get(url, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          file.close();
          this.downloadFile(response.headers.location, destination)
            .then(resolve)
            .catch(reject);
          return;
        }

        const totalSize = parseInt(response.headers['content-length'], 10);
        let downloadedSize = 0;

        response.on('data', (chunk) => {
          downloadedSize += chunk.length;
          const percentage = Math.round((downloadedSize / totalSize) * 100);
          this.updateProgress.percentage = 10 + Math.round(percentage * 0.5);

          const downloadedMB = (downloadedSize / 1024 / 1024).toFixed(1);
          const totalMB = (totalSize / 1024 / 1024).toFixed(1);
          this.updateProgress.message = `Baixando nova versão... ${downloadedMB}MB / ${totalMB}MB`;
        });

        response.pipe(file);

        file.on('finish', () => {
          file.close(resolve);
        });
      }).on('error', (err) => {
        fs.unlink(destination, () => { });
        reject(err);
      });

      file.on('error', (err) => {
        fs.unlink(destination, () => { });
        reject(err);
      });
    });
  }

  getUpdateProgress() {
    return this.updateProgress;
  }
}

module.exports = new UpdaterService(); 