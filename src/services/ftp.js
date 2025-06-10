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
    logger.log(`Conectando ao servidor FTP ${host}:${port}...`);
    await client.access({
      host,
      port,
      user,
      password,
    });
    logger.log('Conexão FTP bem-sucedida.');

    const targetDir = remoteDir || '/';
    let remotePath;

    if (targetDir && targetDir !== '/') {
      await client.ensureDir(targetDir);
      remotePath = path.posix.join(targetDir, remoteFileName);
    } else {
      remotePath = remoteFileName;
    }

    logger.log(`Enviando arquivo ${localFilePath} para ${host}:${remotePath}...`);
    await client.uploadFrom(localFilePath, remotePath);
    logger.log('Upload FTP concluído.');

    fs.unlink(localFilePath, (err) => {
      if (err) logger.error(`Erro ao excluir arquivo local pós-upload: ${localFilePath}`, err);
      else logger.log(`Arquivo local excluído com sucesso: ${localFilePath}`);
    });

  } catch (err) {
    logFriendlyFTPError(err, 'Erro durante a operação FTP');
  } finally {
    if (client.closed === false) {
      client.close();
      logger.log('Conexão FTP fechada.');
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