const ftp = require('basic-ftp');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const { logFriendlyFTPError } = require('../utils/errorHandler');

async function uploadToFtp(localFilePath, ftpConfig) {
  const { host, port, user, password, remoteDir } = ftpConfig;
  const remoteFileName = path.basename(localFilePath);

  if (!host || !user || !password) {
    logger.warn('Configurações de FTP incompletas. Upload cancelado.');
    return;
  }

  const client = new ftp.Client();
  try {
    logger.info(`Conectando ao servidor FTP ${host}:${port}...`);
    await client.access({
      host,
      port,
      user,
      password,
    });
    logger.info('Conexão FTP bem-sucedida.');

    const targetDir = remoteDir || '/';
    let remotePath;

    if (targetDir && targetDir !== '/') {
      await client.ensureDir(targetDir);
      remotePath = path.posix.join(targetDir, remoteFileName);
    } else {
      remotePath = remoteFileName;
    }

    try {
      logger.info(`Verificando e removendo versão anterior do backup no FTP: ${remotePath}`);
      await client.remove(remotePath);
      logger.info('Versão anterior removida com sucesso.');
    } catch (err) {
      if (err.code === 550) {
        logger.info('Nenhuma versão anterior do backup encontrada no FTP. Prosseguindo com o upload.');
      } else {
        throw err;
      }
    }

    logger.info(`Enviando arquivo ${localFilePath} para ${host}:${remotePath}...`);
    await client.uploadFrom(localFilePath, remotePath);
    logger.info('Upload FTP concluído.');

  } catch (err) {
    logFriendlyFTPError(err, 'Erro durante a operação FTP');
  } finally {
    if (client.closed === false) {
      client.close();
      logger.info('Conexão FTP fechada.');
    }
  }
}

async function testFtpConnection(ftpConfig) {
  const { host, port, user, password, remoteDir } = ftpConfig;

  if (!host || !user || !password) {
    throw new Error('Configurações de FTP incompletas');
  }

  const client = new ftp.Client();
  try {
    client.ftp.timeout = 10000;

    await client.access({
      host,
      port: port || 21,
      user,
      password,
    });

    if (remoteDir && remoteDir !== '/') {
      await client.cd(remoteDir);
    }

    await client.list();

    return {
      success: true,
      message: 'Conexão FTP estabelecida com sucesso!'
    };

  } catch (err) {
    throw err;
  } finally {
    if (client.closed === false) {
      client.close();
    }
  }
}

module.exports = {
  uploadToFtp,
  testFtpConnection
}; 