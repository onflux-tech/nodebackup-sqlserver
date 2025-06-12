const logger = require('./utils/logger');
const fs = require('fs');
const path = require('path');

function ensureAssets() {
  if (!process.pkg) {
    return;
  }

  const baseDir = path.dirname(process.execPath);
  const publicDir = path.join(baseDir, 'public');

  if (fs.existsSync(publicDir)) {
    return;
  }

  try {
    const embeddedAssets = require('./embedded-assets.js');
    for (const [filePath, base64Content] of Object.entries(embeddedAssets)) {
      const absolutePath = path.join(baseDir, filePath);
      const dirName = path.dirname(absolutePath);

      fs.mkdirSync(dirName, { recursive: true });

      const fileContent = Buffer.from(base64Content, 'base64');
      fs.writeFileSync(absolutePath, fileContent);
    }
  } catch (error) {
    logger.error('Falha crítica ao extrair recursos internos. A aplicação não pode iniciar.');
    logger.error(error);
    setTimeout(() => process.exit(1), 5000);
  }
}

ensureAssets();

const { loadConfig } = require('./config');
const { startServer } = require('./server');
const { scheduleBackups } = require('./services/scheduler');
const windowsService = require('./services/windowsService');
const { initializeDatabase } = require('./services/history');

async function main() {
  logger.info('Iniciando a aplicação de backup...');

  if (windowsService.handleServiceCommands()) {
    return;
  }

  try {
    await initializeDatabase();
  } catch (error) {
    logger.error('Falha ao inicializar o banco de dados de histórico. A aplicação será encerrada.', error);
    process.exit(1);
  }

  if (!loadConfig()) {
    logger.error('Falha ao carregar a configuração. A aplicação será encerrada.');
    process.exit(1);
  }

  startServer();
  scheduleBackups();
}

main(); 