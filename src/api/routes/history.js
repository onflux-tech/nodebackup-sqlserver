const express = require('express');
const { getHistory, getHistoryStats } = require('../../services/history');
const logger = require('../../utils/logger');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const { page, limit, status, sort, order } = req.query;
    const options = {
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 10,
      status,
      sort,
      order
    };
    const history = await getHistory(options);
    res.json(history);
  } catch (error) {
    logger.error('Erro ao buscar histórico de backups', error);
    res.status(500).json({
      error: 'Erro ao buscar histórico de backups',
      details: error.message
    });
  }
});

router.get('/stats', requireAuth, async (req, res) => {
  try {
    const stats = await getHistoryStats();
    res.json(stats);
  } catch (error) {
    logger.error('Erro ao buscar estatísticas do histórico', error);
    res.status(500).json({
      error: 'Erro ao buscar estatísticas do histórico',
      details: error.message
    });
  }
});

module.exports = router; 