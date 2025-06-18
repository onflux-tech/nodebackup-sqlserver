const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const logger = require('../../utils/logger');
const notificationService = require('../../services/notification');
const { getConfig, saveConfig } = require('../../config');

router.post('/test-smtp', requireAuth, async (req, res) => {
  try {
    const { host, port, secure, user, password } = req.body;

    if (!host || !port || !user || !password) {
      logger.warn('⚠️ Campos obrigatórios faltando:', {
        host: !!host,
        port: !!port,
        user: !!user,
        password: !!password
      });
      return res.status(400).json({
        error: 'Configurações SMTP incompletas',
        details: 'Host, porta, usuário e senha são obrigatórios'
      });
    }

    const smtpConfig = {
      host,
      port: parseInt(port),
      secure: secure === true || port === 465,
      user,
      password
    };

    const result = await notificationService.testConnection(smtpConfig);

    if (result.success) {
      res.json({
        message: result.message
      });
    } else {
      logger.warn('⚠️ Falha no teste de conexão SMTP');
      res.status(400).json({
        error: result.message,
        suggestions: result.suggestions
      });
    }
  } catch (error) {
    logger.error('❌ Erro ao testar conexão SMTP', error);
    res.status(500).json({
      error: 'Erro interno ao testar SMTP',
      details: error.message
    });
  }
});

router.post('/test-email', requireAuth, async (req, res) => {
  try {
    const { testRecipient } = req.body;
    const config = getConfig();

    if (!config.notifications || !config.notifications.smtp || !config.notifications.smtp.enabled) {
      return res.status(400).json({
        error: 'SMTP não configurado',
        details: 'Configure o SMTP antes de enviar email de teste'
      });
    }

    if (!testRecipient) {
      return res.status(400).json({
        error: 'Email destinatário é obrigatório'
      });
    }

    await notificationService.configure(config.notifications.smtp);

    const testData = {
      databases: ['TestDB1', 'TestDB2'],
      totalSize: 1048576,
      duration: 30000,
      timestamp: new Date().toISOString(),
      files: ['TestDB1_20240101_120000.7z', 'TestDB2_20240101_120000.7z']
    };

    await notificationService.sendSuccessNotification(
      testData,
      [testRecipient],
      config.clientName || 'Cliente Teste'
    );

    logger.info(`📧 Email de teste enviado para ${testRecipient}`);
    res.json({
      message: `Email de teste enviado com sucesso para ${testRecipient}`
    });

  } catch (error) {
    logger.error('❌ Erro ao enviar email de teste', error);
    res.status(500).json({
      error: 'Erro ao enviar email de teste',
      details: error.message
    });
  }
});

router.get('/config', requireAuth, async (req, res) => {
  try {
    const config = getConfig();

    const notificationConfig = {
      smtp: {
        enabled: (config.notifications && config.notifications.smtp && config.notifications.smtp.enabled) || false,
        host: (config.notifications && config.notifications.smtp && config.notifications.smtp.host) || '',
        port: (config.notifications && config.notifications.smtp && config.notifications.smtp.port) || 587,
        secure: (config.notifications && config.notifications.smtp && config.notifications.smtp.secure) || false,
        user: (config.notifications && config.notifications.smtp && config.notifications.smtp.user) || '',
        password: (config.notifications && config.notifications.smtp && config.notifications.smtp.password) || ''
      },
      schedule: {
        sendOnSuccess: (config.notifications && config.notifications.schedule && config.notifications.schedule.sendOnSuccess) || false,
        sendOnFailure: (config.notifications && config.notifications.schedule && config.notifications.schedule.sendOnFailure !== false),
        recipients: (config.notifications && config.notifications.schedule && config.notifications.schedule.recipients) || []
      }
    };

    res.json(notificationConfig);
  } catch (error) {
    logger.error('❌ Erro ao obter configurações de notificação', error);
    res.status(500).json({
      error: 'Erro ao obter configurações',
      details: error.message
    });
  }
});

router.post('/config', requireAuth, async (req, res) => {
  try {
    const { smtp, schedule } = req.body;

    const config = getConfig();

    if (!config.notifications) {
      config.notifications = {};
    }

    if (smtp) {
      config.notifications.smtp = {
        enabled: smtp.enabled || false,
        host: smtp.host || '',
        port: parseInt(smtp.port) || 587,
        secure: smtp.secure === true || parseInt(smtp.port) === 465,
        user: smtp.user || '',
        password: smtp.password || (config.notifications.smtp && config.notifications.smtp.password) || ''
      };

      if (smtp.password) {
        config.notifications.smtp.password = smtp.password;
      }
    }

    if (schedule) {
      config.notifications.schedule = {
        sendOnSuccess: schedule.sendOnSuccess || false,
        sendOnFailure: schedule.sendOnFailure !== false,
        recipients: Array.isArray(schedule.recipients) ? schedule.recipients : []
      };
    }

    const saved = saveConfig();
    if (!saved) {
      logger.error('❌ Falha ao salvar configurações no arquivo');
      return res.status(500).json({
        error: 'Erro ao salvar configurações'
      });
    }

    if (config.notifications.smtp && config.notifications.smtp.enabled) {
      try {
        await notificationService.configure(config.notifications.smtp);
      } catch (configError) {
        logger.warn('⚠️ Erro ao configurar serviço de notificação', configError);
      }
    }

    res.json({
      message: 'Configurações de notificação salvas com sucesso'
    });

  } catch (error) {
    logger.error('❌ Erro ao salvar configurações de notificação', error);
    res.status(500).json({
      error: 'Erro ao salvar configurações',
      details: error.message
    });
  }
});

module.exports = router; 