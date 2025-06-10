const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const mssql = require('mssql');
const logger = require('../utils/logger');
const { baseDir } = require('../config');
const { uploadToFtp } = require('./ftp');
const { logFriendlyError } = require('../utils/errorHandler');

const sevenZipAsset = path.join(baseDir, '7za.exe');

function performSingleBackup(dbName, backupNumber, backupDir, dbConfig) {
  return new Promise((resolve, reject) => {
    const { server, user, password } = dbConfig;
    const backupFileName = `${dbName}-${backupNumber}.bak`;
    const backupFilePath = path.join(backupDir, backupFileName);

    const sqlCmd = `sqlcmd -S "${server}" -U "${user}" -P "${password}" -Q "BACKUP DATABASE [${dbName}] TO DISK = N'${backupFilePath}' WITH NOINIT, NOUNLOAD, NAME = N'${dbName} full backup', NOSKIP, STATS = 10, NOREWIND"`;

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

async function performConsolidatedBackup(dbList, clientName, backupNumber, dbConfig, ftpConfig) {
  const finalZipName = `${clientName}-${backupNumber}.7z`;
  const backupsDir = path.join(baseDir, 'backups');
  const finalZipPath = path.join(backupsDir, finalZipName);
  const backupFilePaths = [];

  try {
    fs.mkdirSync(backupsDir, { recursive: true });

    logger.info(`Iniciando rotina de limpeza para o backup #${backupNumber}...`);
    const filesInBackupDir = fs.readdirSync(backupsDir);
    for (const file of filesInBackupDir) {
      if (file.endsWith(`-${backupNumber}.bak`)) {
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

    if (fs.existsSync(finalZipPath)) {
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

    exec(zipCmd, (error, stdout, stderr) => {
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
        uploadToFtp(finalZipPath, ftpConfig);
      } else {
        logger.info('FTP não configurado, backup consolidado mantido localmente.');
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
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  };

  try {
    await mssql.connect(sqlConfig);
    const result = await mssql.query`SELECT name FROM sys.databases WHERE name NOT IN ('master', 'tempdb', 'model', 'msdb') ORDER BY name`;
    return result.recordset.map(r => r.name);
  } catch (err) {
    logFriendlyError(err, 'Erro ao conectar ou listar bancos de dados');
    throw err;
  } finally {
    await mssql.close();
  }
}

module.exports = {
  performConsolidatedBackup,
  listDatabases,
}; 