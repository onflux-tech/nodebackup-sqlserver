const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');
const mssql = require('mssql');
const logger = require('../utils/logger');
const { baseDir } = require('../config');
const { uploadToFtp, cleanupFtpBackups } = require('./ftp');
const { logFriendlyError } = require('../utils/errorHandler');
const { addHistoryRecord } = require('./history');

const execAsync = promisify(exec);
const sevenZipAsset = path.join(baseDir, '7za.exe');

function performSingleBackup(dbName, backupNumber, backupDir, dbConfig) {
  const { server, user, password } = dbConfig;
  const backupFileName = `${dbName}-${backupNumber}.bak`;
  const backupFilePath = path.join(backupDir, backupFileName);

  const sqlCmd = `sqlcmd -S "${server}" -U "${user}" -P "${password}" -C -Q "BACKUP DATABASE [${dbName}] TO DISK = N'${backupFilePath}' WITH NOINIT, NOUNLOAD, NAME = N'${dbName} full backup', NOSKIP, STATS = 10, NOREWIND"`;

  logger.info(`-> Gerando backup para o banco: ${dbName}`);
  return execAsync(sqlCmd)
    .then(({ stdout, stderr }) => {
      if (stderr && stderr.length > 0) {
        logger.warn(`sqlcmd stderr (${dbName}): ${stderr}`);
      }
      logger.info(`-> Backup de ${dbName} concluído: ${backupFilePath}`);
      return backupFilePath;
    })
    .catch(error => {
      logger.error(`Erro ao executar backup do ${dbName}`, { error: error.message, stderr: error.stderr });
      throw error;
    });
}

async function performConsolidatedBackup(dbList, clientName, backupNumber, dbConfig, storageConfig, retentionConfig) {
  const startTime = Date.now();
  let isSuccess = true;
  let historyRecord = {
    databases: dbList,
    status: 'pending',
    fileSize: 0,
    duration: 0,
    errorMessage: null,
    details: ''
  };

  const backupsDir = path.join(baseDir, 'backups');
  let finalZipPath;

  try {
    const useTimestamp = retentionConfig && retentionConfig.enabled && retentionConfig.mode === 'retention';
    let finalZipName;

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

    finalZipPath = path.join(backupsDir, finalZipName);
    const backupFilePaths = [];

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
          throw new Error(`Não foi possível excluir o arquivo .bak órfão: ${orphanPath}. Verifique as permissões e se o arquivo não está em uso.`);
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
        throw new Error(`Não foi possível excluir o arquivo .7z anterior: ${finalZipPath}. Verifique as permissões e se o arquivo não está em uso.`);
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

    const { stdout: zipStdout, stderr: zipStderr } = await execAsync(zipCmd);
    if (zipStderr && zipStderr.length > 0) {
      logger.warn(`7za stderr: ${zipStderr}`);
    }
    logger.info(`Backup consolidado compactado com sucesso: ${finalZipPath}`);
    historyRecord.details += 'Compactação bem-sucedida. ';

    for (const filePath of backupFilePaths) {
      try {
        fs.unlinkSync(filePath);
        logger.info(`Arquivo .bak excluído: ${filePath}`);
      } catch (err) {
        isSuccess = false;
        logger.error(`Erro ao excluir arquivo .bak temporário: ${filePath}`, err);
        historyRecord.errorMessage = (historyRecord.errorMessage ? historyRecord.errorMessage + '; ' : '') + `Falha ao limpar .bak: ${path.basename(filePath)}`;
      }
    }

    if (storageConfig && storageConfig.ftp && storageConfig.ftp.enabled && storageConfig.ftp.host) {
      const shouldOverwrite = !useTimestamp;
      try {
        await uploadToFtp(finalZipPath, storageConfig.ftp, shouldOverwrite);
        historyRecord.details += 'Upload FTP realizado. ';
      } catch (ftpError) {
        isSuccess = false;
        historyRecord.errorMessage = `FTP: ${ftpError.message}`;
        historyRecord.details += `Falha no Upload FTP: ${ftpError.message}. `;
      }
    } else {
      logger.info('Armazenamento FTP não configurado ou desabilitado, upload pulado.');
    }

    if (storageConfig && storageConfig.networkPath && storageConfig.networkPath.enabled && storageConfig.networkPath.path) {
      try {
        const destDir = storageConfig.networkPath.path;
        const fileName = path.basename(finalZipPath);
        const destPath = path.join(destDir, fileName);

        logger.info(`Copiando backup para o local de rede: ${destPath}`);
        if (!fs.existsSync(destDir)) {
          logger.info(`Diretório de destino não existe, criando: ${destDir}`);
          fs.mkdirSync(destDir, { recursive: true });
        }

        fs.copyFileSync(finalZipPath, destPath);
        logger.info(`Arquivo copiado com sucesso para: ${destPath}`);
        historyRecord.details += 'Cópia para local de rede bem-sucedida. ';
      } catch (copyError) {
        isSuccess = false;
        logger.error(`Falha ao copiar arquivo para o local de rede: ${storageConfig.networkPath.path}`, { error: copyError.message });
        historyRecord.errorMessage = (historyRecord.errorMessage ? historyRecord.errorMessage + '; ' : '') + `Cópia: ${copyError.message}`;
        historyRecord.details += `Falha na cópia para local de rede: ${copyError.message}. `;
      }
    } else {
      logger.info('Armazenamento em Local de Rede não configurado ou desabilitado.');
    }

    if (retentionConfig && retentionConfig.enabled && retentionConfig.autoCleanup) {
      logger.info('Iniciando limpeza automática de backups antigos...');
      historyRecord.details += 'Iniciando limpeza. ';

      if (retentionConfig.mode === 'classic') {
        logger.info('Modo clássico ativo: limpeza automática por sobrescrita já foi realizada no upload');
      } else {
        try {
          if (retentionConfig.localDays > 0) {
            const localCleanup = await cleanupOldBackups(retentionConfig.localDays, clientName);
            if (localCleanup.errors > 0) {
              isSuccess = false;
              const specificErrors = localCleanup.errorMessages.join(', ');
              historyRecord.errorMessage = (historyRecord.errorMessage ? historyRecord.errorMessage + '; ' : '') + `Limpeza: ${specificErrors || `${localCleanup.errors} erro(s) na limpeza local.`}`;
            }
            if (localCleanup.removed > 0) {
              logger.info(`Limpeza local: ${localCleanup.removed} arquivo(s) removido(s)`);
            }
          }

          if (storageConfig && storageConfig.ftp && storageConfig.ftp.enabled && storageConfig.ftp.host && retentionConfig.ftpDays > 0) {
            const ftpCleanup = await cleanupFtpBackups(storageConfig.ftp, retentionConfig.ftpDays, clientName);
            if (ftpCleanup.errors > 0) {
              isSuccess = false;
              const specificErrors = ftpCleanup.errorMessages.join(', ');
              historyRecord.errorMessage = (historyRecord.errorMessage ? historyRecord.errorMessage + '; ' : '') + `Limpeza: ${specificErrors || `${ftpCleanup.errors} erro(s) na limpeza do FTP.`}`;
            }
            if (ftpCleanup.removed > 0) {
              logger.info(`Limpeza FTP: ${ftpCleanup.removed} arquivo(s) removido(s)`);
            }
          }

          logger.info('Limpeza automática concluída');
        } catch (cleanupError) {
          isSuccess = false;
          logger.error('Erro durante a limpeza automática', cleanupError);
          historyRecord.errorMessage = (historyRecord.errorMessage ? historyRecord.errorMessage + '; ' : '') + `Limpeza: ${cleanupError.message}`;
        }
      }
    }

    const stats = fs.statSync(finalZipPath);
    historyRecord.status = isSuccess ? 'success' : 'failed';
    historyRecord.fileSize = (stats.size / (1024 * 1024)).toFixed(2);
    if (isSuccess) {
      historyRecord.details = 'Backup concluído com sucesso. ' + historyRecord.details;
    }

  } catch (error) {
    isSuccess = false;
    logger.error('Falha no processo de backup consolidado. A operação foi abortada.', { stack: error.stack });
    historyRecord.status = 'failed';
    historyRecord.errorMessage = error.message;

  } finally {
    if (historyRecord.status === 'pending') {
      historyRecord.status = isSuccess ? 'success' : 'failed';
    }
    historyRecord.duration = (Date.now() - startTime) / 1000;
    addHistoryRecord(historyRecord);
    logger.info(`Registro de histórico adicionado: status ${historyRecord.status}`);
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

async function cleanupOldBackups(retentionDays, clientName) {
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
      return { removed: 0, errors: 0, errorMessages: [] };
    }

    const files = fs.readdirSync(backupsDir);
    const backupFiles = files.filter(file => file.endsWith('.7z'));

    let removedCount = 0;
    let errorCount = 0;
    const errorMessages = [];

    logger.info(`Encontrados ${backupFiles.length} arquivo(s) de backup .7z local`);

    for (const file of backupFiles) {
      const filePath = path.join(backupsDir, file);

      try {
        const stats = fs.statSync(filePath);
        const fileDate = getLocalFileDate(file, stats);

        if (!fileDate) {
          logger.warn(`Pulando arquivo ${file}: não foi possível determinar a data`);
          errorCount++;
          errorMessages.push(`Não foi possível determinar a data do arquivo ${file}`);
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
        errorMessages.push(error.message);
      }
    }

    if (removedCount > 0) {
      logger.info(`Limpeza concluída: ${removedCount} arquivo(s) removido(s), ${errorCount} erro(s)`);
    } else {
      logger.info('Nenhum backup antigo encontrado para remoção');
    }

    return { removed: removedCount, errors: errorCount, errorMessages };

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