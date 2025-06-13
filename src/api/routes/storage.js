const express = require('express');
const { getConfig } = require('../../config');
const { cleanupOldBackups } = require('../../services/database');
const { testFtpConnection, cleanupFtpBackups } = require('../../services/ftp');
const logger = require('../../utils/logger');
const { translateFTPError } = require('../../utils/errorHandler');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/test-ftp', requireAuth, async (req, res) => {
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

router.post('/cleanup-local', requireAuth, async (req, res) => {
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

router.post('/cleanup-ftp', requireAuth, async (req, res) => {
  const config = getConfig();
  const retentionConfig = config.retention;
  const ftpConfig = config.storage ? config.storage.ftp : null;

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

  if (!ftpConfig || !ftpConfig.enabled || !ftpConfig.host) {
    return res.status(400).json({
      error: 'FTP não configurado ou desabilitado',
      details: 'Configure e habilite o armazenamento FTP antes de executar a limpeza remota'
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