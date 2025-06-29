const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const updaterService = require('../../services/updater');
const logger = require('../../utils/logger');
const packageJson = require('../../../package.json');

router.get('/version', (req, res) => {
  res.json({
    currentVersion: packageJson.version,
    updateAvailable: false
  });
});

router.get('/check', requireAuth, async (req, res) => {
  try {
    const updateInfo = await updaterService.checkForUpdates();
    res.json(updateInfo);
  } catch (error) {
    logger.error('Erro ao verificar atualizações:', error);
    res.status(500).json({
      error: 'Erro ao verificar atualizações',
      details: error.message
    });
  }
});

router.post('/install', requireAuth, async (req, res) => {
  try {
    const { downloadUrl, downloadType } = req.body;

    if (!downloadUrl) {
      return res.status(400).json({
        error: 'URL de download não fornecida'
      });
    }

    updaterService.performUpdate(downloadUrl, downloadType).catch(error => {
      logger.error('Erro durante atualização:', error);
    });

    res.json({
      message: 'Atualização iniciada',
      status: 'starting'
    });
  } catch (error) {
    logger.error('Erro ao iniciar atualização:', error);
    res.status(500).json({
      error: 'Erro ao iniciar atualização',
      details: error.message
    });
  }
});

router.get('/progress', requireAuth, (req, res) => {
  const progress = updaterService.getUpdateProgress();
  res.json(progress);
});

module.exports = router; 