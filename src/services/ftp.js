const ftp = require('basic-ftp');
const path = require('path');
const logger = require('../utils/logger');
const { logFriendlyFTPError } = require('../utils/errorHandler');

async function uploadToFtp(localFilePath, ftpConfig, shouldOverwrite = true) {
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

    if (shouldOverwrite) {
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
    } else {
      logger.info('Modo retenção ativo: não removendo versões anteriores, política de retenção gerenciará a limpeza.');
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

async function cleanupFtpBackups(ftpConfig, retentionDays) {
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

  function getFileDate(file) {
    logger.debug(`Processando arquivo: ${file.name}, modifiedAt: ${file.modifiedAt}, rawModifiedAt: ${JSON.stringify(file.rawModifiedAt)}`);

    if (file.modifiedAt) {
      try {
        const date = new Date(file.modifiedAt);
        if (!isNaN(date.getTime())) {
          logger.debug(`Data obtida via modifiedAt: ${date.toISOString()}`);
          return date;
        }
      } catch (err) {
        logger.debug(`Erro ao parsear modifiedAt: ${err.message}`);
      }
    }

    if (file.rawModifiedAt) {
      try {
        let dateStr = file.rawModifiedAt.trim();

        const noYearMatch = dateStr.match(/^(\w{3})\s+(\d{1,2})\s+(\d{1,2}):(\d{2})$/);
        if (noYearMatch) {
          const [, month, day, hour, minute] = noYearMatch;
          const currentYear = new Date().getFullYear();

          dateStr = `${month} ${day} ${currentYear} ${hour}:${minute}`;
          logger.debug(`Formato sem ano detectado, assumindo ano atual: ${dateStr}`);
        }

        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          logger.debug(`Data obtida via rawModifiedAt: ${date.toISOString()}`);
          return date;
        }
      } catch (err) {
        logger.debug(`Erro ao parsear rawModifiedAt: ${err.message}`);
      }
    }

    if (file.date) {
      try {
        let dateStr = file.date.trim();

        const noYearMatch = dateStr.match(/^(\w{3})\s+(\d{1,2})\s+(\d{1,2}):(\d{2})$/);
        if (noYearMatch) {
          const [, month, day, hour, minute] = noYearMatch;
          const currentYear = new Date().getFullYear();

          dateStr = `${month} ${day} ${currentYear} ${hour}:${minute}`;
          logger.debug(`Formato sem ano detectado no campo date, assumindo ano atual: ${dateStr}`);
        }

        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          logger.debug(`Data obtida via date: ${date.toISOString()}`);
          return date;
        }
      } catch (err) {
        logger.debug(`Erro ao parsear date: ${err.message}`);
      }
    }

    const timestampMatch = file.name.match(/(\d{4})-(\d{2})-(\d{2})-(\d{6})/);
    if (timestampMatch) {
      try {
        const [, year, month, day, time] = timestampMatch;
        const hour = time.substring(0, 2);
        const minute = time.substring(2, 4);
        const second = time.substring(4, 6);

        const dateFromName = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
          parseInt(hour),
          parseInt(minute),
          parseInt(second)
        );

        if (!isNaN(dateFromName.getTime())) {
          logger.debug(`Data extraída do nome do arquivo: ${dateFromName.toISOString()}`);
          return dateFromName;
        }
      } catch (err) {
        logger.debug(`Erro ao extrair data do nome do arquivo: ${err.message}`);
      }
    }

    logger.warn(`Não foi possível determinar a data do arquivo: ${file.name}`);
    return null;
  }

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
      file.type === 1 && file.name.endsWith('.7z')
    );

    logger.info(`Encontrados ${backupFiles.length} arquivo(s) de backup .7z no FTP`);

    for (const file of backupFiles) {
      try {
        const fileDate = getFileDate(file);

        if (!fileDate) {
          logger.warn(`Pulando arquivo ${file.name}: não foi possível determinar a data`);
          errorCount++;
          continue;
        }

        if (fileDate < cutoffDate) {
          const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);

          await client.remove(file.name);
          logger.info(`Backup FTP antigo removido: ${file.name} (${fileSizeMB} MB, data: ${fileDate.toISOString().split('T')[0]})`);
          removedCount++;
        } else {
          logger.debug(`Mantendo backup FTP: ${file.name} (data: ${fileDate.toISOString().split('T')[0]})`);
        }
      } catch (error) {
        logger.error(`Erro ao processar arquivo FTP ${file.name}: ${error.message}`);
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