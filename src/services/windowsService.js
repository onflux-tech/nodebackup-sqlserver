const { exec, execSync } = require('child_process');
const path = require('path');
const logger = require('../utils/logger');
const { baseDir } = require('../config');

const SERVICE_NAME = 'NodeBackupSQLServer';
const nssmPath = path.join(baseDir, 'nssm.exe');

function checkAdminPrivileges(callback) {
  exec('net session', (err) => {
    if (err) {
      logger.error('Erro: Este comando requer privilégios de Administrador. Por favor, execute como Administrador.');
      return callback(new Error('Permissões de administrador necessárias'), false);
    }
    return callback(null, true);
  });
}

function installService() {
  checkAdminPrivileges((err) => {
    if (err) return;

    try {
      logger.info(`Instalando o serviço '${SERVICE_NAME}'...`);
      const exePath = process.execPath;
      const logFilePath = path.join(baseDir, 'backup.log');

      execSync(`"${nssmPath}" install ${SERVICE_NAME} "${exePath}"`);
      execSync(`"${nssmPath}" set ${SERVICE_NAME} AppDirectory "${baseDir}"`);
      execSync(`"${nssmPath}" set ${SERVICE_NAME} DisplayName "Serviço de Backup Automático SqlServer"`);
      execSync(`"${nssmPath}" set ${SERVICE_NAME} Description "Executa backups automáticos de bancos de dados SQL Server."`);

      execSync(`"${nssmPath}" set ${SERVICE_NAME} AppStdout "${logFilePath}"`);
      execSync(`"${nssmPath}" set ${SERVICE_NAME} AppStderr "${logFilePath}"`);

      execSync(`"${nssmPath}" set ${SERVICE_NAME} Start SERVICE_AUTO_START`);
      execSync(`"${nssmPath}" start ${SERVICE_NAME}`);
      logger.info('Serviço instalado e iniciado com sucesso!');
    } catch (error) {
      logger.error('Falha ao instalar o serviço.', { stack: error.stack });
    }
  });
}

function uninstallService() {
  checkAdminPrivileges((err) => {
    if (err) return;

    try {
      logger.info(`Desinstalando o serviço '${SERVICE_NAME}'...`);
      execSync(`"${nssmPath}" stop ${SERVICE_NAME}`, { stdio: 'ignore' });
      execSync(`"${nssmPath}" remove ${SERVICE_NAME} confirm`);
      logger.info('Serviço desinstalado com sucesso!');
    } catch (error) {
      logger.error('Falha ao desinstalar o serviço.', error);
    }
  });
}

function handleServiceCommands() {
  const command = process.argv[2];
  if (command && typeof command === 'string') {
    const lowerCaseCommand = command.toLowerCase();
    if (lowerCaseCommand === '--install') {
      installService();
      return true;
    }
    if (lowerCaseCommand === '--uninstall') {
      uninstallService();
      return true;
    }
  }
  return false;
}

module.exports = {
  handleServiceCommands,
}; 