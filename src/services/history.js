const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const dbPath = path.join(process.cwd(), 'history.db');
const jsonBackupPath = path.join(process.cwd(), 'history-backup.json');
let db;
let sqliteEnabled = false;
let initSqlJs;

async function loadSqlJs() {
  try {
    initSqlJs = require('sql.js');

    const possiblePaths = [
      path.join(process.cwd(), 'node_modules', 'sql.js', 'dist'),
      path.join(__dirname, '..', '..', 'node_modules', 'sql.js', 'dist'),
      path.join(process.cwd(), 'dist'),
      path.join(process.cwd()),
      path.resolve(__dirname, '..', '..', 'node_modules', 'sql.js', 'dist')
    ];

    let workingPath = null;

    for (const testPath of possiblePaths) {
      const sqlWasmPath = path.join(testPath, 'sql-wasm.wasm');
      if (fs.existsSync(sqlWasmPath)) {
        workingPath = testPath;
        break;
      }
    }

    const SQL = await initSqlJs({
      locateFile: file => {
        if (workingPath) {
          return path.join(workingPath, file);
        }
        return file;
      }
    });

    return SQL;
  } catch (error) {
    logger.warn('Falha ao carregar sql.js, usando fallback JSON:', error.message);
    return null;
  }
}

async function initializeDatabase() {
  if (db || sqliteEnabled) {
    return;
  }

  try {
    const SQL = await loadSqlJs();

    if (SQL) {
      let dbFileBuffer;
      if (fs.existsSync(dbPath)) {
        dbFileBuffer = fs.readFileSync(dbPath);
      } else {
        logger.info('Criando nova base de dados SQLite.');
      }

      db = new SQL.Database(dbFileBuffer);

      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp TEXT NOT NULL,
          databases TEXT NOT NULL,
          status TEXT NOT NULL,
          fileSize REAL,
          duration REAL,
          errorMessage TEXT,
          details TEXT
        );
      `;

      db.run(createTableQuery);
      persist();
      sqliteEnabled = true;
    } else {
      throw new Error('SQLite não disponível');
    }
  } catch (err) {
    logger.warn('Falha ao inicializar SQLite, usando fallback JSON:', err.message);
    sqliteEnabled = false;

    await migrateFromSqliteToJson();

    logger.info('Serviço de histórico inicializado com fallback JSON.');
  }
}

async function migrateFromSqliteToJson() {
  try {
    if (fs.existsSync(dbPath) && !fs.existsSync(jsonBackupPath)) {
      logger.info('Tentando migrar dados existentes do SQLite para JSON...');

      const SQL = await loadSqlJs();
      if (SQL) {
        const dbFileBuffer = fs.readFileSync(dbPath);
        const tempDb = new SQL.Database(dbFileBuffer);

        const stmt = tempDb.prepare('SELECT * FROM history ORDER BY timestamp DESC');
        const records = [];

        while (stmt.step()) {
          const row = stmt.getAsObject();
          try {
            row.databases = JSON.parse(row.databases);
          } catch (e) {
          }
          records.push(row);
        }

        stmt.free();
        tempDb.close();

        if (records.length > 0) {
          fs.writeFileSync(jsonBackupPath, JSON.stringify(records, null, 2));
          logger.info(`Migrados ${records.length} registros do SQLite para JSON.`);
        }
      }
    }
  } catch (error) {
    logger.warn('Falha na migração SQLite para JSON:', error.message);
  }
}

function persist() {
  if (!db) return;

  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);

    createJsonBackup();
  } catch (err) {
    logger.error('Falha ao salvar base de dados SQLite:', err.message);
  }
}

function createJsonBackup() {
  if (!sqliteEnabled || !db) return;

  try {
    const stmt = db.prepare('SELECT * FROM history ORDER BY timestamp DESC');
    const records = [];

    while (stmt.step()) {
      const row = stmt.getAsObject();
      try {
        row.databases = JSON.parse(row.databases);
      } catch (e) {
      }
      records.push(row);
    }

    stmt.free();

    if (records.length > 0) {
      fs.writeFileSync(jsonBackupPath, JSON.stringify(records, null, 2));
    }
  } catch (error) {
    logger.warn('Falha ao criar backup JSON:', error.message);
  }
}

function addHistoryRecord(record) {
  if (sqliteEnabled && db) {
    return addHistoryRecordSqlite(record);
  } else {
    return addHistoryRecordJson(record);
  }
}

function addHistoryRecordSqlite(record) {
  try {
    const stmt = db.prepare(`
      INSERT INTO history (timestamp, databases, status, fileSize, duration, errorMessage, details)
      VALUES (:timestamp, :databases, :status, :fileSize, :duration, :errorMessage, :details)
    `);

    stmt.run({
      ':timestamp': record.timestamp || new Date().toISOString(),
      ':databases': JSON.stringify(record.databases || []),
      ':status': record.status,
      ':fileSize': record.fileSize,
      ':duration': record.duration,
      ':errorMessage': record.errorMessage,
      ':details': record.details
    });

    stmt.free();
    persist();

    return true;
  } catch (error) {
    logger.error('Falha ao adicionar registro SQLite:', error.message);
    return addHistoryRecordJson(record);
  }
}

function addHistoryRecordJson(record) {
  try {
    let records = [];

    if (fs.existsSync(jsonBackupPath)) {
      const data = fs.readFileSync(jsonBackupPath, 'utf8');
      records = JSON.parse(data);
    }

    const newRecord = {
      id: records.length > 0 ? Math.max(...records.map(r => r.id || 0)) + 1 : 1,
      timestamp: record.timestamp || new Date().toISOString(),
      databases: record.databases || [],
      status: record.status,
      fileSize: record.fileSize,
      duration: record.duration,
      errorMessage: record.errorMessage,
      details: record.details
    };

    records.unshift(newRecord);

    if (records.length > 1000) {
      records = records.slice(0, 1000);
    }

    fs.writeFileSync(jsonBackupPath, JSON.stringify(records, null, 2));
    return true;
  } catch (error) {
    logger.error('Falha ao adicionar registro JSON:', error.message);
    return false;
  }
}

function getHistory(options = {}) {
  if (sqliteEnabled && db) {
    return getHistorySqlite(options);
  } else {
    return getHistoryJson(options);
  }
}

function getHistorySqlite(options = {}) {
  try {
    const { page = 1, limit = 10, status, sort = 'timestamp', order = 'desc' } = options;
    const offset = (page - 1) * limit;

    let whereClause = '';
    const params = {};

    if (status) {
      whereClause = 'WHERE status = :status';
      params[':status'] = status;
    }

    const countQuery = `SELECT COUNT(*) as count FROM history ${whereClause}`;
    const countStmt = db.prepare(countQuery);
    const totalResult = countStmt.getAsObject(params);
    const total = totalResult.count;
    countStmt.free();

    const dataQuery = `
      SELECT * FROM history ${whereClause}
      ORDER BY ${sort} ${order}
      LIMIT :limit OFFSET :offset
    `;
    const dataStmt = db.prepare(dataQuery);

    const results = [];
    dataStmt.bind({ ...params, ':limit': limit, ':offset': offset });
    while (dataStmt.step()) {
      const row = dataStmt.getAsObject();
      try {
        row.databases = JSON.parse(row.databases);
      } catch (e) {
      }
      results.push(row);
    }
    dataStmt.free();

    return {
      data: results,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    logger.error('Falha ao buscar histórico SQLite:', error.message);
    return getHistoryJson(options);
  }
}

function getHistoryJson(options = {}) {
  try {
    const { page = 1, limit = 10, status, sort = 'timestamp', order = 'desc' } = options;

    let records = [];

    if (fs.existsSync(jsonBackupPath)) {
      const data = fs.readFileSync(jsonBackupPath, 'utf8');
      records = JSON.parse(data);
    }

    if (status) {
      records = records.filter(record => record.status === status);
    }

    records.sort((a, b) => {
      let aVal = a[sort];
      let bVal = b[sort];

      if (sort === 'timestamp') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      if (order === 'desc') {
        return bVal - aVal;
      } else {
        return aVal - bVal;
      }
    });

    const total = records.length;
    const offset = (page - 1) * limit;
    const paginatedRecords = records.slice(offset, offset + limit);

    return {
      data: paginatedRecords,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    logger.error('Falha ao buscar histórico JSON:', error.message);
    return {
      data: [],
      pagination: { total: 0, page: 1, limit: 10, totalPages: 0 }
    };
  }
}

function getHistoryStats() {
  if (sqliteEnabled && db) {
    return getHistoryStatsSqlite();
  } else {
    return getHistoryStatsJson();
  }
}

function getHistoryStatsSqlite() {
  try {
    const queries = {
      total: 'SELECT COUNT(*) AS value FROM history',
      success: "SELECT COUNT(*) AS value FROM history WHERE status = 'success'",
      failed: "SELECT COUNT(*) AS value FROM history WHERE status = 'failed'",
      avgDuration: 'SELECT AVG(duration) AS value FROM history',
      totalSize: 'SELECT SUM(fileSize) AS value FROM history'
    };

    const stats = {};
    for (const key in queries) {
      try {
        const stmt = db.prepare(queries[key]);
        if (stmt.step()) {
          const result = stmt.getAsObject();
          stats[key] = result.value || 0;
        } else {
          stats[key] = 0;
        }
        stmt.free();
      } catch (e) {
        stats[key] = 0;
      }
    }

    return stats;
  } catch (error) {
    logger.error('Falha ao obter estatísticas SQLite:', error.message);
    return getHistoryStatsJson();
  }
}

function getHistoryStatsJson() {
  try {
    let records = [];

    if (fs.existsSync(jsonBackupPath)) {
      const data = fs.readFileSync(jsonBackupPath, 'utf8');
      records = JSON.parse(data);
    }

    const total = records.length;
    const success = records.filter(r => r.status === 'success').length;
    const failed = records.filter(r => r.status === 'failed').length;

    const durationsWithValue = records.filter(r => r.duration && r.duration > 0);
    const avgDuration = durationsWithValue.length > 0
      ? durationsWithValue.reduce((sum, r) => sum + r.duration, 0) / durationsWithValue.length
      : 0;

    const sizesWithValue = records.filter(r => r.fileSize && r.fileSize > 0);
    const totalSize = sizesWithValue.reduce((sum, r) => sum + r.fileSize, 0);

    return {
      total,
      success,
      failed,
      avgDuration,
      totalSize
    };
  } catch (error) {
    logger.error('Falha ao obter estatísticas JSON:', error.message);
    return {
      total: 0,
      success: 0,
      failed: 0,
      avgDuration: 0,
      totalSize: 0
    };
  }
}

module.exports = {
  initializeDatabase,
  addHistoryRecord,
  getHistory,
  getHistoryStats,
}; 