const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const mssql = require('mssql');
const logger = require('../utils/logger');
const { baseDir } = require('../config');
const { uploadToFtp, cleanupFtpBackups } = require('./ftp');
const { logFriendlyError } = require('../utils/errorHandler');

const sevenZipAsset = path.join(baseDir, '7za.exe');

function performSingleBackup(dbName, backupNumber, backupDir, dbConfig) {
  return new Promise((resolve, reject) => {
    const { server, user, password } = dbConfig;
    const backupFileName = `${dbName}-${backupNumber}.bak`;
    const backupFilePath = path.join(backupDir, backupFileName);

    const sqlCmd = `sqlcmd -S "${server}" -U "${user}" -P "${password}" -C -Q "BACKUP DATABASE [${dbName}] TO DISK = N'${backupFilePath}' WITH NOINIT, NOUNLOAD, NAME = N'${dbName} full backup', NOSKIP, STATS = 10, NOREWIND"`;

    logger.info(`-> Gerando backup para o banco: ${dbName}`);
    exec(sqlCmd, (error, stdout, stderr) => {
      if (error) {
        logger.error(`Erro ao executar backup do ${dbName}`, { error: error.message, stderr });
        return reject(error);
      }
      if (stderr && stderr.length > 0) {
        logger.warn(`sqlcmd stderr (${dbName}): ${stderr}`);
      }
      logger.info(`-> Backup de ${dbName} concluído: ${backupFilePath}`);
      resolve(backupFilePath);
    });
  });
}

async function performConsolidatedBackup(dbList, clientName, backupNumber, dbConfig, ftpConfig, retentionConfig) {
  let finalZipName;
  const useTimestamp = retentionConfig && retentionConfig.enabled && retentionConfig.mode === 'retention';

  if (useTimestamp) {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '');
    finalZipName = `${clientName}-${dateStr}-${timeStr}.7z`;
    logger.info(`Modo retenção ativo: usando nomenclatura com timestamp ${finalZipName}`);
  } else {
    finalZipName = `${clientName}-${backupNumber}.7z`;
    logger.info(`Modo clássico ativo: usando numeração por horário ${finalZipName}`);
  }

  const backupsDir = path.join(baseDir, 'backups');
  const finalZipPath = path.join(backupsDir, finalZipName);
  const backupFilePaths = [];

  try {
    fs.mkdirSync(backupsDir, { recursive: true });

    logger.info(`Iniciando rotina de limpeza para o backup...`);
    const filesInBackupDir = fs.readdirSync(backupsDir);
    for (const file of filesInBackupDir) {
      const isOrphanBak = file.endsWith('.bak') && (
        file.endsWith(`-${backupNumber}.bak`) ||
        file.includes(clientName)
      );

      if (isOrphanBak) {
        const orphanPath = path.join(backupsDir, file);
        logger.warn(`Arquivo .bak órfão encontrado: ${orphanPath}. Excluindo...`);
        try {
          fs.unlinkSync(orphanPath);
          logger.info(`Arquivo .bak órfão excluído: ${orphanPath}`);
        } catch (err) {
          logger.error(`Falha ao excluir arquivo .bak órfão: ${orphanPath}`, err);
        }
      }
    }

    if (fs.existsSync(finalZipPath) && !useTimestamp) {
      logger.info(`Arquivo de backup .7z existente encontrado: ${finalZipPath}. Excluindo antes de prosseguir.`);
      try {
        fs.unlinkSync(finalZipPath);
        logger.info(`Arquivo .7z anterior excluído com sucesso.`);
      } catch (err) {
        logger.error(`Falha ao excluir o arquivo .7z existente: ${finalZipPath}`, err);
      }
    }

    logger.info(`Iniciando backups individuais na pasta: ${backupsDir}`);

    for (const dbName of dbList) {
      const backupPath = await performSingleBackup(dbName, backupNumber, backupsDir, dbConfig);
      backupFilePaths.push(backupPath);
    }

    logger.info('Todos os backups individuais foram concluídos com sucesso.');
    logger.info(`Compactando todos os bancos em um único arquivo: ${finalZipPath}`);

    const filesToCompress = backupFilePaths.map(p => `"${p}"`).join(' ');
    const zipCmd = `"${sevenZipAsset}" a -t7z -mx=9 "${finalZipPath}" ${filesToCompress}`;

    exec(zipCmd, async (error, stdout, stderr) => {
      if (error) {
        logger.error(`Erro ao compactar o backup consolidado`, { error: error.message, stderr });
        return;
      }
      if (stderr && stderr.length > 0) {
        logger.warn(`7za stderr: ${stderr}`);
      }
      logger.info(`Backup consolidado compactado com sucesso: ${finalZipPath}`);

      backupFilePaths.forEach(filePath => {
        fs.unlink(filePath, (err) => {
          if (err) logger.error(`Erro ao excluir arquivo .bak: ${filePath}`, err);
          else logger.info(`Arquivo .bak excluído: ${filePath}`);
        });
      });

      if (ftpConfig && ftpConfig.host) {
        const shouldOverwrite = !useTimestamp;
        uploadToFtp(finalZipPath, ftpConfig, shouldOverwrite);
      } else {
        logger.info('FTP não configurado, backup consolidado mantido localmente.');
      }

      if (retentionConfig && retentionConfig.enabled && retentionConfig.autoCleanup) {
        logger.info('Iniciando limpeza automática de backups antigos...');

        if (retentionConfig.mode === 'classic') {
          logger.info('Modo clássico ativo: limpeza automática por sobrescrita já foi realizada no upload');
        } else {
          try {
            if (retentionConfig.localDays > 0) {
              const localCleanup = await cleanupOldBackups(retentionConfig.localDays, clientName);
              if (localCleanup.removed > 0) {
                logger.info(`Limpeza local: ${localCleanup.removed} arquivo(s) removido(s)`);
              }
            }

            if (ftpConfig && ftpConfig.host && retentionConfig.ftpDays > 0) {
              const ftpCleanup = await cleanupFtpBackups(ftpConfig, retentionConfig.ftpDays, clientName);
              if (ftpCleanup.removed > 0) {
                logger.info(`Limpeza FTP: ${ftpCleanup.removed} arquivo(s) removido(s)`);
              }
            }

            logger.info('Limpeza automática concluída');
          } catch (cleanupError) {
            logger.error('Erro durante a limpeza automática', cleanupError);
          }
        }
      }
    });

  } catch (error) {
    logger.error('Falha no processo de backup consolidado. A operação foi abortada.', { stack: error.stack });
  }
}

async function listDatabases(dbConfig) {
  const { server, user, password } = dbConfig;

  const sqlConfig = {
    user,
    password,
    server,
    options: {
      trustServerCertificate: true,
      enableArithAbort: true,
      encrypt: false,
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
    connectionTimeout: 30000,
    requestTimeout: 30000
  };

  logger.info(`Tentando conectar ao SQL Server: ${server}`);
  logger.debug('Configuração de conexão (sem senha):', {
    server: sqlConfig.server,
    user: sqlConfig.user,
    encrypt: sqlConfig.options.encrypt
  });

  try {
    await mssql.connect(sqlConfig);
    logger.info('Conexão estabelecida com sucesso ao SQL Server');

    const result = await mssql.query`SELECT name FROM sys.databases WHERE name NOT IN ('master', 'tempdb', 'model', 'msdb') ORDER BY name`;
    logger.info(`Bancos de dados encontrados: ${result.recordset.length}`);

    return result.recordset.map(r => r.name);
  } catch (err) {
    logger.error('Erro detalhado de conexão:', {
      message: err.message,
      code: err.code,
      name: err.name,
      originalError: (err.originalError && err.originalError.message) || 'N/A'
    });

    logFriendlyError(err, 'Erro ao conectar ou listar bancos de dados');
    throw err;
  } finally {
    try {
      await mssql.close();
      logger.debug('Conexão SQL Server fechada');
    } catch (closeErr) {
      logger.warn('Erro ao fechar conexão:', closeErr.message);
    }
  }
}

async function cleanupOldBackups(retentionDays) {
  const backupsDir = path.join(baseDir, 'backups');
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  logger.info(`Iniciando limpeza de backups locais anteriores a ${cutoffDate.toISOString().split('T')[0]} (${retentionDays} dias)`);

  function getLocalFileDate(filename, stats) {
    const timestampMatch = filename.match(/(\d{4})-(\d{2})-(\d{2})-(\d{6})/);
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
          logger.debug(`Data extraída do nome do arquivo local: ${dateFromName.toISOString()}`);
          return dateFromName;
        }
      } catch (err) {
        logger.debug(`Erro ao extrair data do nome do arquivo local: ${err.message}`);
      }
    }

    try {
      const fileDate = stats.mtime;
      if (fileDate && !isNaN(fileDate.getTime())) {
        logger.debug(`Data obtida via mtime: ${fileDate.toISOString()}`);
        return fileDate;
      }
    } catch (err) {
      logger.debug(`Erro ao usar mtime: ${err.message}`);
    }

    logger.warn(`Não foi possível determinar a data do arquivo local: ${filename}`);
    return null;
  }

  try {
    if (!fs.existsSync(backupsDir)) {
      logger.info('Diretório de backups não existe, nada para limpar.');
      return { removed: 0, errors: 0 };
    }

    const files = fs.readdirSync(backupsDir);
    const backupFiles = files.filter(file => file.endsWith('.7z'));

    let removedCount = 0;
    let errorCount = 0;

    logger.info(`Encontrados ${backupFiles.length} arquivo(s) de backup .7z local`);

    for (const file of backupFiles) {
      const filePath = path.join(backupsDir, file);

      try {
        const stats = fs.statSync(filePath);
        const fileDate = getLocalFileDate(file, stats);

        if (!fileDate) {
          logger.warn(`Pulando arquivo ${file}: não foi possível determinar a data`);
          errorCount++;
          continue;
        }

        if (fileDate < cutoffDate) {
          const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

          fs.unlinkSync(filePath);
          logger.info(`Backup antigo removido: ${file} (${fileSizeMB} MB, data: ${fileDate.toISOString().split('T')[0]})`);
          removedCount++;
        } else {
          logger.debug(`Mantendo backup local: ${file} (data: ${fileDate.toISOString().split('T')[0]})`);
        }
      } catch (error) {
        logger.error(`Erro ao processar arquivo ${file}: ${error.message}`);
        errorCount++;
      }
    }

    if (removedCount > 0) {
      logger.info(`Limpeza concluída: ${removedCount} arquivo(s) removido(s), ${errorCount} erro(s)`);
    } else {
      logger.info('Nenhum backup antigo encontrado para remoção');
    }

    return { removed: removedCount, errors: errorCount };

  } catch (error) {
    logger.error('Erro durante a limpeza de backups locais', error);
    throw error;
  }
}

module.exports = {
  performConsolidatedBackup,
  listDatabases,
  cleanupOldBackups
}; 