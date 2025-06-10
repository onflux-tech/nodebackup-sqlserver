const express = require('express');
const bcrypt = require('bcryptjs');
const { getConfig, setConfig, saveConfig } = require('../config');
const { listDatabases, cleanupOldBackups } = require('../services/database');
const { reschedule } = require('../services/scheduler');
const logger = require('../utils/logger');
const { translateDatabaseError, translateFTPError } = require('../utils/errorHandler');
const { testFtpConnection, cleanupFtpBackups } = require('../services/ftp');

const router = express.Router();

router.get('/config', (req, res) => {
  res.json(getConfig());
});

router.post('/config', (req, res) => {
  const currentConfig = getConfig();
  const newConfig = req.body;

  const finalConfig = {
    ...currentConfig,
    ...newConfig
  };

  setConfig(finalConfig);

  if (saveConfig()) {
    reschedule();
    res.status(200).json({ message: 'Configurações salvas com sucesso.' });
  } else {
    res.status(500).json({ message: 'Erro ao salvar as configurações.' });
  }
});

router.get('/list-databases', async (req, res) => {
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

router.post('/test-ftp', async (req, res) => {
  const ftpConfig = req.body;

  if (!ftpConfig.host || !ftpConfig.user || !ftpConfig.password) {
    return res.status(400).json({
      error: 'Configurações FTP incompletas',
      details: 'Host, usuário e senha são obrigatórios'
    });
  }

  try {
    const result = await testFtpConnection(ftpConfig);
    res.json(result);
  } catch (err) {
    const errorInfo = translateFTPError(err);
    logger.error('Falha ao testar conexão FTP.');
    res.status(500).json({
      error: errorInfo.friendly,
      details: errorInfo.details,
      suggestions: errorInfo.suggestions
    });
  }
});

router.post('/setup', (req, res) => {
  const config = getConfig();
  if (!config.app.isInitialSetup) {
    return res.status(403).json({ message: 'A configuração inicial já foi realizada.' });
  }

  const { username, password } = req.body;
  if (!username || !password || password.length < 6) {
    return res.status(400).json({ message: 'Usuário e senha (mínimo 6 caracteres) são obrigatórios.' });
  }

  const salt = bcrypt.genSaltSync(10);
  config.app.username = username;
  config.app.password = bcrypt.hashSync(password, salt);
  config.app.isInitialSetup = false;

  setConfig(config);
  if (saveConfig()) {
    res.status(200).json({ message: 'Conta de administrador criada com sucesso.' });
  } else {
    res.status(500).json({ message: 'Erro ao salvar a configuração.' });
  }
});

router.post('/change-password', (req, res) => {
  const { username, oldPassword, newPassword, confirmNewPassword } = req.body;
  const config = getConfig();

  if (config.app.isInitialSetup) {
    return res.status(403).json({ message: 'Execute a configuração inicial primeiro.' });
  }

  if (newPassword !== confirmNewPassword) {
    return res.status(400).json({ message: 'As novas senhas não coincidem.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'A nova senha deve ter pelo menos 6 caracteres.' });
  }

  const storedUser = config.app.username;
  const storedHash = config.app.password;

  if (username === storedUser && bcrypt.compareSync(oldPassword, storedHash)) {
    const salt = bcrypt.genSaltSync(10);
    config.app.password = bcrypt.hashSync(newPassword, salt);
    setConfig(config);
    if (saveConfig()) {
      res.status(200).json({ message: 'Senha alterada com sucesso.' });
    } else {
      res.status(500).json({ message: 'Erro ao salvar a nova senha.' });
    }
  } else {
    res.status(401).json({ message: 'Usuário ou senha antiga incorretos.' });
  }
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const config = getConfig();

  const storedUser = config.app.username;
  const storedHash = config.app.password;

  if (username === storedUser && bcrypt.compareSync(password, storedHash)) {
    req.session.user = { username: storedUser };
    res.status(200).json({ message: 'Login bem-sucedido.' });
  } else {
    res.status(401).json({ message: 'Usuário ou senha inválidos.' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ message: 'Não foi possível fazer logout.' });
    }
    res.clearCookie('connect.sid');
    res.status(200).json({ message: 'Logout bem-sucedido.' });
  });
});

router.post('/cleanup-local', async (req, res) => {
  const config = getConfig();
  const retentionConfig = config.retention;

  if (!retentionConfig || !retentionConfig.enabled) {
    return res.status(400).json({
      error: 'Política de retenção não está habilitada',
      details: 'Ative a política de retenção nas configurações para usar esta funcionalidade'
    });
  }

  if (retentionConfig.mode === 'classic') {
    return res.status(400).json({
      error: 'Limpeza manual não disponível no modo clássico',
      details: 'No modo clássico, os backups são automaticamente sobrescritos. Use o modo retenção para limpeza baseada em dias.',
      suggestions: [
        'Altere para "Modo Retenção" nas configurações',
        'O modo clássico mantém apenas a versão mais recente de cada horário'
      ]
    });
  }

  try {
    const clientName = config.clientName || 'Backup';
    const result = await cleanupOldBackups(retentionConfig.localDays, clientName);

    logger.info(`Limpeza manual local executada: ${result.removed} arquivo(s) removido(s), ${result.errors} erro(s)`);

    res.json({
      message: `Limpeza local concluída: ${result.removed} arquivo(s) removido(s)`,
      data: {
        removed: result.removed,
        errors: result.errors,
        retentionDays: retentionConfig.localDays
      }
    });
  } catch (error) {
    logger.error('Erro na limpeza manual local', error);
    res.status(500).json({
      error: 'Erro durante a limpeza local',
      details: error.message
    });
  }
});

router.post('/cleanup-ftp', async (req, res) => {
  const config = getConfig();
  const retentionConfig = config.retention;
  const ftpConfig = config.ftp;

  if (!retentionConfig || !retentionConfig.enabled) {
    return res.status(400).json({
      error: 'Política de retenção não está habilitada',
      details: 'Ative a política de retenção nas configurações para usar esta funcionalidade'
    });
  }

  if (retentionConfig.mode === 'classic') {
    return res.status(400).json({
      error: 'Limpeza manual não disponível no modo clássico',
      details: 'No modo clássico, os backups FTP são automaticamente sobrescritos. Use o modo retenção para limpeza baseada em dias.',
      suggestions: [
        'Altere para "Modo Retenção" nas configurações',
        'O modo clássico substitui automaticamente a versão anterior no FTP'
      ]
    });
  }

  if (!ftpConfig || !ftpConfig.host) {
    return res.status(400).json({
      error: 'FTP não configurado',
      details: 'Configure as credenciais FTP antes de executar a limpeza remota'
    });
  }

  try {
    const clientName = config.clientName || 'Backup';
    const result = await cleanupFtpBackups(ftpConfig, retentionConfig.ftpDays, clientName);

    logger.info(`Limpeza manual FTP executada: ${result.removed} arquivo(s) removido(s), ${result.errors} erro(s)`);

    res.json({
      message: `Limpeza FTP concluída: ${result.removed} arquivo(s) removido(s)`,
      data: {
        removed: result.removed,
        errors: result.errors,
        retentionDays: retentionConfig.ftpDays
      }
    });
  } catch (error) {
    const errorInfo = translateFTPError(error);
    logger.error('Erro na limpeza manual FTP', error);
    res.status(500).json({
      error: errorInfo.friendly,
      details: errorInfo.details,
      suggestions: errorInfo.suggestions
    });
  }
});

module.exports = router; 