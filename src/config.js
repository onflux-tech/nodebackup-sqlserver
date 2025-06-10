const fs = require('fs');
const path = require('path');
const logger = require('./utils/logger');
const { encrypt, decrypt } = require('./utils/encryption');

const isPkg = typeof process.pkg !== 'undefined';
const baseDir = isPkg ? path.dirname(process.execPath) : process.cwd();
const configFile = path.join(baseDir, 'config.json');
const encryptedConfigFile = path.join(baseDir, 'config.enc');

let config = {};

function getDefaultConfig() {
  return {
    app: {
      username: '',
      password: '',
      sessionSecret: require('crypto').randomBytes(32).toString('hex'),
      isInitialSetup: true
    },
    clientName: 'Cliente',
    database: {
      server: '',
      user: '',
      password: '',
      databases: []
    },
    ftp: {
      host: '',
      port: 21,
      user: '',
      password: '',
      remoteDir: '/'
    },
    backupSchedule: ['00:00'],
    retention: {
      enabled: true,
      localDays: 7,
      ftpDays: 30,
      autoCleanup: true,
      mode: 'retention'
    }
  };
}

function loadConfig() {
  try {
    if (fs.existsSync(encryptedConfigFile)) {
      const encryptedData = fs.readFileSync(encryptedConfigFile, 'utf8');
      const decryptedConfig = decrypt(encryptedData);
      if (decryptedConfig) {
        config = decryptedConfig;
        logger.info('Configurações criptografadas carregadas com sucesso.');
      } else {
        logger.error('Falha ao descriptografar o arquivo de configuração. Verifique se o arquivo não está corrompido.');
        config = getDefaultConfig();
        saveConfig();
      }
    } else if (fs.existsSync(configFile)) {
      logger.info('Arquivo config.json encontrado. Migrando para o formato criptografado...');
      const configData = fs.readFileSync(configFile, 'utf8');
      config = JSON.parse(configData);

      if (!config.app) {
        const defaultConfig = getDefaultConfig();
        config.app = defaultConfig.app;
      }

      if (!config.retention) {
        const defaultConfig = getDefaultConfig();
        config.retention = defaultConfig.retention;
        logger.info('Configuração de retenção adicionada com valores padrão.');
      }

      saveConfig();
      fs.unlinkSync(configFile);
      logger.info('Migração concluída. O arquivo config.json foi removido por segurança.');
    } else {
      config = getDefaultConfig();
      saveConfig();
      logger.info('Arquivo de configuração não encontrado. Um novo (config.enc) foi criado.');
      logger.warn('Nenhuma conta de administrador configurada. Acesse a interface web para criar uma.');
    }
    return true;
  } catch (err) {
    logger.error('Erro crítico ao carregar as configurações.', err);
    return false;
  }
}

function saveConfig() {
  try {
    const encryptedData = encrypt(config);
    fs.writeFileSync(encryptedConfigFile, encryptedData, 'utf8');
    return true;
  } catch (err) {
    logger.error('Erro ao salvar o arquivo de configuração criptografado.', err);
    return false;
  }
}

function getConfig() {
  return config;
}

function setConfig(newConfig) {
  config = newConfig;
}

module.exports = {
  loadConfig,
  saveConfig,
  getConfig,
  setConfig,
  baseDir
}; 