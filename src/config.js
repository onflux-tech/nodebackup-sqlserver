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
      sessionSecret: '',
      isInitialSetup: true
    },
    clientName: 'Cliente',
    database: {
      server: '',
      user: '',
      password: '',
      databases: []
    },
    storage: {
      ftp: {
        enabled: false,
        host: '',
        port: 21,
        user: '',
        password: '',
        remoteDir: '/'
      },
      networkPath: {
        enabled: false,
        path: ''
      }
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

function ensureSessionSecret(config) {
  if (!config.app) {
    config.app = getDefaultConfig().app;
  }

  if (!config.app.sessionSecret || config.app.sessionSecret === '') {
    config.app.sessionSecret = require('crypto').randomBytes(32).toString('hex');
    return true;
  }

  return false;
}

function loadConfig() {
  try {
    let configChanged = false;

    if (fs.existsSync(encryptedConfigFile)) {
      const encryptedData = fs.readFileSync(encryptedConfigFile, 'utf8');
      const decryptedConfig = decrypt(encryptedData);
      if (decryptedConfig) {
        config = decryptedConfig;

        if (config._needsMigration) {
          delete config._needsMigration;
          configChanged = true;
          logger.info('🔄 Migrando configuração para nova chave de criptografia...');
        }

        if (ensureSessionSecret(config)) {
          configChanged = true;
        }

        if (config.ftp && !config.storage) {
          logger.warn('MIGRATION: Configuração de FTP antiga detectada. Migrando para o novo formato de Armazenamento.');
          config.storage = {
            ftp: {
              enabled: !!config.ftp.host,
              host: config.ftp.host || '',
              port: config.ftp.port || 21,
              user: config.ftp.user || '',
              password: config.ftp.password || '',
              remoteDir: config.ftp.remoteDir || '/'
            },
            networkPath: {
              enabled: false,
              path: ''
            }
          };
          delete config.ftp;
          configChanged = true;
        } else if (!config.storage) {
          config.storage = getDefaultConfig().storage;
          configChanged = true;
        }

        if (configChanged) {
          saveConfig();
        }

        logger.info('✅ Configurações criptografadas carregadas com sucesso.');
        logger.info(`🔑 SessionSecret: ${config.app.sessionSecret.substring(0, 8)}...`);
      } else {
        logger.error('Falha ao descriptografar o arquivo de configuração. Verifique se o arquivo não está corrompido.');
        config = getDefaultConfig();
        ensureSessionSecret(config);
        saveConfig();
      }
    } else if (fs.existsSync(configFile)) {
      logger.info('Arquivo config.json encontrado. Migrando para o formato criptografado...');
      const configData = fs.readFileSync(configFile, 'utf8');
      config = JSON.parse(configData);

      if (!config.app) {
        const defaultConfig = getDefaultConfig();
        config.app = defaultConfig.app;
        configChanged = true;
      }

      if (ensureSessionSecret(config)) {
        configChanged = true;
      }

      if (config.ftp && !config.storage) {
        logger.warn('MIGRATION: Configuração de FTP antiga (JSON) detectada. Migrando para o novo formato de Armazenamento.');
        config.storage = {
          ftp: {
            enabled: !!config.ftp.host,
            host: config.ftp.host || '',
            port: config.ftp.port || 21,
            user: config.ftp.user || '',
            password: config.ftp.password || '',
            remoteDir: config.ftp.remoteDir || '/'
          },
          networkPath: {
            enabled: false,
            path: ''
          }
        };
        delete config.ftp;
        configChanged = true;
      }

      if (!config.retention) {
        const defaultConfig = getDefaultConfig();
        config.retention = defaultConfig.retention;
        logger.info('Configuração de retenção adicionada com valores padrão.');
        configChanged = true;
      }

      saveConfig();
      fs.unlinkSync(configFile);
      logger.info('Migração concluída. O arquivo config.json foi removido por segurança.');
    } else {
      config = getDefaultConfig();
      ensureSessionSecret(config);
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