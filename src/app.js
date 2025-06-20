const logger = require('./utils/logger');
const fs = require('fs');
const path = require('path');

let isShuttingDown = false;
let server;

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
    setTimeout(() => gracefulShutdown('ASSET_EXTRACTION_FAILED', 1), 5000);
  }
}

async function gracefulShutdown(signal, exitCode = 0) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  try {
    try {
      const { stopScheduler } = require('./services/scheduler');
      if (stopScheduler) {
        stopScheduler();
      }
    } catch (error) {
      logger.warn('⚠️ Erro ao parar scheduler:', error.message);
    }

    try {
      const { closeServer } = require('./server');
      if (closeServer && server) {
        await closeServer();
      }
    } catch (error) {
      logger.warn('⚠️ Erro ao fechar servidor:', error.message);
    }

    try {
      const sql = require('mssql');
      await sql.close();
    } catch (error) {
      logger.warn('⚠️ Erro ao fechar SQL:', error.message);
    }

    try {
      const { saveAllPendingData } = require('./services/history');
      if (saveAllPendingData) {
        await saveAllPendingData();
      }
    } catch (error) {
      logger.warn('⚠️ Erro ao salvar dados:', error.message);
    }

    try {
      if (logger.logBuffer && logger.logBuffer.destroy) {
        logger.logBuffer.destroy();
      }
    } catch (error) {
      logger.warn('⚠️ Erro no cleanup do logger:', error.message);
    }

    process.exit(exitCode);

  } catch (error) {
    process.exit(1);
  }
}

ensureAssets();

const { loadConfig } = require('./config');
const { startServer } = require('./server');
const { scheduleBackups } = require('./services/scheduler');
const windowsService = require('./services/windowsService');
const { initializeDatabase } = require('./services/history');

async function main() {

  if (windowsService.handleServiceCommands()) {
    return;
  }

  try {
    await initializeDatabase();
    logger.info('✅ Banco de dados de histórico inicializado com sucesso');
  } catch (error) {
    logger.error('❌ Falha ao inicializar o banco de dados de histórico. A aplicação será encerrada.', error);
    await gracefulShutdown('DATABASE_INIT_FAILED', 1);
    return;
  }

  if (!loadConfig()) {
    logger.error('❌ Falha ao carregar a configuração. A aplicação será encerrada.');
    await gracefulShutdown('CONFIG_LOAD_FAILED', 1);
    return;
  }

  server = startServer();

  logger.info('⏰ Configurando agendamento de backups...');
  scheduleBackups();

}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM', 0));
process.on('SIGINT', () => gracefulShutdown('SIGINT', 0));
process.on('SIGHUP', () => gracefulShutdown('SIGHUP', 0));

process.on('uncaughtException', (error) => {
  logger.error('❌ Exceção não capturada:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION', 1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('❌ Promise rejeitada não tratada:', reason);
  logger.error('Promise:', promise);
  gracefulShutdown('UNHANDLED_REJECTION', 1);
});

main(); 