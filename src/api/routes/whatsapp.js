const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const logger = require('../../utils/logger');
const whatsappService = require('../../services/whatsapp');
const { getConfig, saveConfig } = require('../../config');

router.post('/test-connection', requireAuth, async (req, res) => {
  try {
    const { baseUrl, token } = req.body;

    if (!baseUrl || !token) {
      logger.warn('⚠️ Campos obrigatórios faltando:', {
        baseUrl: !!baseUrl,
        token: !!token
      });
      return res.status(400).json({
        error: 'Configurações WhatsApp incompletas',
        details: 'URL da API e token são obrigatórios'
      });
    }

    const whatsappConfig = {
      baseUrl: baseUrl.trim(),
      token: token.trim()
    };

    const result = await whatsappService.testConnection(whatsappConfig);

    if (result.success) {
      res.json({
        message: result.message
      });
    } else {
      logger.warn('⚠️ Falha no teste de conexão WhatsApp');
      res.status(400).json({
        error: result.message,
        suggestions: result.suggestions
      });
    }
  } catch (error) {
    logger.error('❌ Erro ao testar conexão WhatsApp', error);
    res.status(500).json({
      error: 'Erro interno ao testar WhatsApp',
      details: error.message
    });
  }
});

router.post('/test-message', requireAuth, async (req, res) => {
  try {
    const { testRecipient } = req.body;
    const config = getConfig();

    if (!config.notifications || !config.notifications.whatsapp || !config.notifications.whatsapp.enabled) {
      return res.status(400).json({
        error: 'WhatsApp não configurado',
        details: 'Configure o WhatsApp antes de enviar mensagem de teste'
      });
    }

    if (!testRecipient) {
      return res.status(400).json({
        error: 'Número de telefone destinatário é obrigatório'
      });
    }

    const phoneRegex = /^\d{10,15}$/;
    const cleanPhone = testRecipient.replace(/\D/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      return res.status(400).json({
        error: 'Número de telefone inválido',
        details: 'Digite apenas números (10-15 dígitos)'
      });
    }

    await whatsappService.configure(config.notifications.whatsapp);

    await whatsappService.sendTestMessage(
      cleanPhone,
      config.clientName || 'Cliente Teste'
    );

    logger.info(`📱 Mensagem de teste WhatsApp enviada para ${cleanPhone}`);
    res.json({
      message: `Mensagem de teste enviada com sucesso para ${cleanPhone}`
    });

  } catch (error) {
    logger.error('❌ Erro ao enviar mensagem de teste WhatsApp', error);
    res.status(500).json({
      error: 'Erro ao enviar mensagem de teste',
      details: error.message
    });
  }
});

router.get('/config', requireAuth, async (req, res) => {
  try {
    const config = getConfig();

    const whatsappConfig = {
      api: {
        enabled: (config.notifications && config.notifications.whatsapp && config.notifications.whatsapp.enabled) || false,
        baseUrl: (config.notifications && config.notifications.whatsapp && config.notifications.whatsapp.baseUrl) || '',
        token: (config.notifications && config.notifications.whatsapp && config.notifications.whatsapp.token) || ''
      },
      schedule: {
        sendOnSuccess: (config.notifications && config.notifications.whatsapp && config.notifications.whatsapp.sendOnSuccess) || false,
        sendOnFailure: (config.notifications && config.notifications.whatsapp && config.notifications.whatsapp.sendOnFailure !== false),
        recipients: (config.notifications && config.notifications.whatsapp && config.notifications.whatsapp.recipients) || []
      }
    };

    res.json(whatsappConfig);
  } catch (error) {
    logger.error('❌ Erro ao obter configurações de WhatsApp', error);
    res.status(500).json({
      error: 'Erro ao obter configurações',
      details: error.message
    });
  }
});

router.post('/config', requireAuth, async (req, res) => {
  try {
    const { api, schedule } = req.body;

    const config = getConfig();

    if (!config.notifications) {
      config.notifications = {};
    }

    if (api) {
      config.notifications.whatsapp = {
        enabled: api.enabled || false,
        baseUrl: api.baseUrl || '',
        token: api.token || (config.notifications.whatsapp && config.notifications.whatsapp.token) || '',
        sendOnSuccess: schedule ? schedule.sendOnSuccess || false : (config.notifications.whatsapp && config.notifications.whatsapp.sendOnSuccess) || false,
        sendOnFailure: schedule ? (schedule.sendOnFailure !== false) : (config.notifications.whatsapp && config.notifications.whatsapp.sendOnFailure !== false),
        recipients: schedule ? (Array.isArray(schedule.recipients) ? schedule.recipients : []) : (config.notifications.whatsapp && config.notifications.whatsapp.recipients) || []
      };

      if (api.token) {
        config.notifications.whatsapp.token = api.token;
      }
    }

    if (schedule && config.notifications.whatsapp) {
      config.notifications.whatsapp.sendOnSuccess = schedule.sendOnSuccess || false;
      config.notifications.whatsapp.sendOnFailure = schedule.sendOnFailure !== false;
      config.notifications.whatsapp.recipients = Array.isArray(schedule.recipients) ? schedule.recipients : [];
    }

    const saved = saveConfig();
    if (!saved) {
      logger.error('❌ Falha ao salvar configurações no arquivo');
      return res.status(500).json({
        error: 'Erro ao salvar configurações'
      });
    }

    if (config.notifications.whatsapp && config.notifications.whatsapp.enabled) {
      try {
        await whatsappService.configure(config.notifications.whatsapp);
      } catch (configError) {
        logger.warn('⚠️ Erro ao configurar serviço de WhatsApp', configError);
      }
    }

    res.json({
      message: 'Configurações de WhatsApp salvas com sucesso'
    });

  } catch (error) {
    logger.error('❌ Erro ao salvar configurações de WhatsApp', error);
    res.status(500).json({
      error: 'Erro ao salvar configurações',
      details: error.message
    });
  }
});

router.post('/check-number', requireAuth, async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Número de telefone é obrigatório.' });
    }

    const config = getConfig();
    if (!config.notifications || !config.notifications.whatsapp || !config.notifications.whatsapp.enabled) {
      return res.status(400).json({ isValid: false, error: 'As notificações do WhatsApp não estão ativadas.' });
    }
    await whatsappService.configure(config.notifications.whatsapp);

    const result = await whatsappService.checkPhoneNumber(phoneNumber);

    return res.json(result);

  } catch (error) {
    logger.error('Erro na rota /api/whatsapp/check-number:', error);
    res.status(500).json({ isValid: false, error: 'Erro interno do servidor ao verificar o número.' });
  }
});

module.exports = router; 