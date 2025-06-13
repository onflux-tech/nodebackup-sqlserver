const express = require('express');
const { getConfig, setConfig, saveConfig } = require('../../config');
const { reschedule } = require('../../services/scheduler');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/config', requireAuth, (req, res) => {
  res.json(getConfig());
});

router.post('/config', requireAuth, (req, res) => {
  const currentConfig = getConfig();
  const newConfig = req.body;

  const finalConfig = {
    ...currentConfig,
    ...newConfig
  };

  if (finalConfig.storage && finalConfig.ftp) {
    delete finalConfig.ftp;
  }

  setConfig(finalConfig);

  if (saveConfig()) {
    reschedule();
    res.status(200).json({ message: 'Configurações salvas com sucesso.' });
  } else {
    res.status(500).json({ message: 'Erro ao salvar as configurações.' });
  }
});

module.exports = router; 