const express = require('express');
const { getConfig } = require('../../config');
const { listDatabases } = require('../../services/database');
const logger = require('../../utils/logger');
const { translateDatabaseError } = require('../../utils/errorHandler');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/list-databases', requireAuth, async (req, res) => {
  let { server, user, password } = req.query;

  if (!server || !user) {
    const config = getConfig();
    server = config.database && config.database.server;
    user = config.database && config.database.user;
    password = config.database && config.database.password;
  }

  if (!server || !user) {
    return res.status(400).json({ error: 'Credenciais do banco de dados não informadas ou não configuradas.' });
  }

  try {
    const databases = await listDatabases({ server, user, password });
    res.json({ databases });
  } catch (err) {
    const errorInfo = translateDatabaseError(err);
    logger.error('Falha ao listar os bancos de dados.');
    res.status(500).json({
      error: errorInfo.friendly,
      details: errorInfo.details,
      suggestions: errorInfo.suggestions
    });
  }
});

router.post('/test-database', requireAuth, async (req, res) => {
  const { server, user, password } = req.body;

  if (!server || !user) {
    return res.status(400).json({
      error: 'Configurações incompletas',
      details: 'Servidor e usuário são obrigatórios'
    });
  }

  try {
    logger.info('Iniciando teste de conexão detalhado...');

    const mssql = require('mssql');
    const testConfig = {
      user,
      password,
      server,
      options: {
        trustServerCertificate: true,
        enableArithAbort: true,
        encrypt: false
      },
      connectionTimeout: 15000,
      requestTimeout: 15000
    };

    const pool = await mssql.connect(testConfig);

    const versionResult = await pool.request().query('SELECT @@VERSION as version');
    const sqlVersion = versionResult.recordset[0].version;

    const permResult = await pool.request().query(`
      SELECT 
        HAS_PERMS_BY_NAME(null, null, 'VIEW SERVER STATE') as canViewServerState,
        HAS_PERMS_BY_NAME(null, null, 'VIEW ANY DATABASE') as canViewDatabases
    `);
    const permissions = permResult.recordset[0];

    await pool.close();

    res.json({
      success: true,
      message: 'Conexão estabelecida com sucesso!',
      diagnostics: {
        sqlVersion: sqlVersion.split('\n')[0],
        permissions: {
          canViewServerState: permissions.canViewServerState === 1,
          canViewDatabases: permissions.canViewDatabases === 1
        },
        connectionMethod: 'SQL Authentication',
        encryptionEnabled: false
      }
    });

  } catch (err) {
    logger.error('Erro no teste de conexão:', err);

    const errorInfo = translateDatabaseError(err);
    res.status(500).json({
      error: errorInfo.friendly,
      details: errorInfo.details,
      suggestions: errorInfo.suggestions,
      diagnostics: {
        errorCode: err.code,
        errorName: err.name,
        serverName: server
      }
    });
  }
});

module.exports = router; 