const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const mssql = require('mssql');
const logger = require('../utils/logger');
const { baseDir } = require('../config');
const { uploadToFtp } = require('./ftp');
const { logFriendlyError } = require('../utils/errorHandler');

const sevenZipAsset = path.join(baseDir, '7za.exe');
const backupDir = path.join(baseDir, 'backups');

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

function getSafeTimeString(time) {
  return time.replace(/:/g, '_');
}

async function performBackup(dbName, dbConfig, ftpConfig) {
  const { server, user, password } = dbConfig;
  const time = new Date().toLocaleTimeString('pt-BR', { hour12: false });
  const safeTime = getSafeTimeString(time);
  const backupFileName = `${dbName}_${new Date().toISOString().split('T')[0]}_${safeTime}.bak`;
  const backupFilePath = path.join(backupDir, backupFileName);
  const zipFileName = `${path.basename(backupFileName, '.bak')}.7z`;
  const zipFilePath = path.join(backupDir, zipFileName);

  const sqlCmd = `sqlcmd -S "${server}" -U "${user}" -P "${password}" -Q "BACKUP DATABASE [${dbName}] TO DISK = N'${backupFilePath}' WITH NOINIT, NOUNLOAD, NAME = N'${dbName} full backup', NOSKIP, STATS = 10, NOREWIND"`;

  logger.log(`Executando backup do banco de dados ${dbName}...`);

  exec(sqlCmd, (error, stdout, stderr) => {
    if (error) {
      logger.error(`Erro ao executar backup do ${dbName}`, error);
      logger.error(`Stderr: ${stderr}`);
      return;
    }
    if (stderr && stderr.length > 0) {
      logger.warn(`sqlcmd stderr (${dbName}): ${stderr}`);
    }
    logger.log(`Backup do banco de dados ${dbName} concluído: ${backupFilePath}`);
    compressAndUpload(backupFilePath, zipFilePath, ftpConfig);
  });
}

function compressAndUpload(backupFilePath, zipFilePath, ftpConfig) {
  const zipCmd = `"${sevenZipAsset}" a -t7z -mx=9 "${zipFilePath}" "${backupFilePath}"`;
  logger.log(`Compactando arquivo de backup para ${zipFilePath}...`);

  exec(zipCmd, (error, stdout, stderr) => {
    if (error) {
      logger.error(`Erro ao compactar backup`, error);
      return;
    }
    if (stderr && stderr.length > 0) {
      logger.warn(`7za stderr: ${stderr}`);
    }
    logger.log(`Backup compactado com sucesso: ${zipFilePath}`);

    fs.unlink(backupFilePath, (err) => {
      if (err) logger.error(`Erro ao excluir arquivo .bak: ${backupFilePath}`, err);
    });

    if (ftpConfig && ftpConfig.host) {
      uploadToFtp(zipFilePath, ftpConfig);
    } else {
      logger.log('FTP não configurado, backup mantido localmente.');
    }
  });
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
  performBackup,
  listDatabases,
}; 