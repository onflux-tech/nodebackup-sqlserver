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

async function cleanupFtpBackups(ftpConfig, retentionDays, clientName) {
  const { host, port, user, password, remoteDir } = ftpConfig;

  if (!host || !user || !password) {
    logger.info('Configurações de FTP incompletas. Limpeza FTP cancelada.');
    return { removed: 0, errors: 0 };
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  logger.info(`Iniciando limpeza de backups FTP anteriores a ${cutoffDate.toISOString().split('T')[0]} (${retentionDays} dias)`);

  const client = new ftp.Client();
  let removedCount = 0;
  let errorCount = 0;

  try {
    client.ftp.timeout = 15000;

    logger.info(`Conectando ao servidor FTP ${host}:${port} para limpeza...`);
    await client.access({
      host,
      port: port || 21,
      user,
      password,
    });

    const targetDir = remoteDir || '/';
    if (targetDir && targetDir !== '/') {
      await client.cd(targetDir);
    }

    logger.info(`Listando arquivos no diretório FTP: ${targetDir}`);
    const files = await client.list();

    const backupFiles = files.filter(file =>
      file.type === 1 &&
      file.name.endsWith('.7z') &&
      (clientName ? file.name.startsWith(clientName) : true)
    );

    logger.info(`Encontrados ${backupFiles.length} arquivo(s) de backup no FTP`);

    for (const file of backupFiles) {
      try {
        const fileDate = new Date(file.modifiedAt);

        if (fileDate < cutoffDate) {
          const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);

          await client.remove(file.name);
          logger.info(`Backup FTP antigo removido: ${file.name} (${fileSizeMB} MB, data: ${fileDate.toISOString().split('T')[0]})`);
          removedCount++;
        } else {
          logger.debug(`Mantendo backup FTP: ${file.name} (data: ${fileDate.toISOString().split('T')[0]})`);
        }
      } catch (error) {
        logger.error(`Erro ao processar arquivo FTP ${file.name}`, error);
        errorCount++;
      }
    }

    if (removedCount > 0) {
      logger.info(`Limpeza FTP concluída: ${removedCount} arquivo(s) removido(s), ${errorCount} erro(s)`);
    } else {
      logger.info('Nenhum backup FTP antigo encontrado para remoção');
    }

    return { removed: removedCount, errors: errorCount };

  } catch (error) {
    logger.error('Erro durante a limpeza de backups FTP', error);
    errorCount++;
    return { removed: removedCount, errors: errorCount };
  } finally {
    if (client.closed === false) {
      client.close();
      logger.info('Conexão FTP de limpeza fechada.');
    }
  }
}

module.exports = {
  uploadToFtp,
  testFtpConnection,
  cleanupFtpBackups
}; 