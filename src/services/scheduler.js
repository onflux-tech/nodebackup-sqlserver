const schedule = require('node-schedule');
const logger = require('../utils/logger');
const { getConfig } = require('../config');
const { performConsolidatedBackup } = require('./database');
const notificationService = require('./notification');
const whatsappService = require('./whatsapp');

let scheduledJobs = [];

function isWhatsAppEnabled(config) {
  return config && config.notifications && config.notifications.whatsapp && config.notifications.whatsapp.enabled;
}

function scheduleBackups() {
  const initialConfig = getConfig();
  if (!initialConfig || !initialConfig.backupSchedule) {
    logger.warn('Agendamento de backups pulado: configuração de horários não encontrada.');
    return;
  }

  initialConfig.backupSchedule.forEach((time, index) => {
    if (!time || typeof time !== 'string' || !time.includes(':')) {
      logger.error(`Horário inválido no índice ${index}: ${time}`);
      return;
    }
    
    const [hour, minute] = time.split(':');
    const hourNum = parseInt(hour, 10);
    const minuteNum = parseInt(minute, 10);
    
    if (isNaN(hourNum) || isNaN(minuteNum) || hourNum < 0 || hourNum > 23 || minuteNum < 0 || minuteNum > 59) {
      logger.error(`Horário inválido: ${time}. Deve estar no formato HH:MM com valores válidos.`);
      return;
    }
    
    const rule = new schedule.RecurrenceRule();
    rule.hour = hourNum;
    rule.minute = minuteNum;

    const backupNumber = index + 1;

    const job = schedule.scheduleJob(rule, async () => {
      const currentConfig = getConfig();
      if (!currentConfig || !currentConfig.database || !currentConfig.database.databases || currentConfig.database.databases.length === 0) {
        logger.warn(`Backup para o horário ${time} pulado: nenhum banco de dados selecionado na configuração atual.`);
        return;
      }

      logger.info(`Disparando backup consolidado #${backupNumber} para as ${time}. Bancos: ${currentConfig.database.databases.join(', ')}`);

      if (currentConfig.notifications && currentConfig.notifications.smtp && currentConfig.notifications.smtp.enabled) {
        try {
          await notificationService.configure(currentConfig.notifications.smtp);
        } catch (error) {
          logger.warn('⚠️ Erro ao configurar notificações SMTP', error);
        }
      }

      if (isWhatsAppEnabled(currentConfig)) {
        try {
          await whatsappService.configure(currentConfig.notifications.whatsapp);
        } catch (error) {
          logger.warn('⚠️ Erro ao configurar notificações WhatsApp', error);
        }
      }

      try {
        const backupResult = await performConsolidatedBackup(
          currentConfig.database.databases,
          currentConfig.clientName,
          backupNumber,
          currentConfig.database,
          currentConfig.storage,
          currentConfig.retention
        );

        if (backupResult && backupResult.status === 'success') {
          if (currentConfig.notifications &&
            currentConfig.notifications.smtp &&
            currentConfig.notifications.smtp.enabled &&
            currentConfig.notifications.schedule &&
            currentConfig.notifications.schedule.sendOnSuccess &&
            currentConfig.notifications.schedule.recipients &&
            currentConfig.notifications.schedule.recipients.length > 0) {

            const backupData = {
              databases: currentConfig.database.databases,
              totalSize: backupResult.totalSize || 0,
              duration: backupResult.duration || 0,
              timestamp: new Date().toISOString(),
              files: backupResult.files || []
            };

            await notificationService.sendSuccessNotification(
              backupData,
              currentConfig.notifications.schedule.recipients,
              currentConfig.clientName || 'Cliente'
            );
          }

          if (isWhatsAppEnabled(currentConfig) &&
            currentConfig.notifications.whatsapp.sendOnSuccess &&
            currentConfig.notifications.whatsapp.recipients &&
            currentConfig.notifications.whatsapp.recipients.length > 0) {

            const backupData = {
              databases: currentConfig.database.databases,
              totalSize: backupResult.totalSize || 0,
              duration: backupResult.duration || 0,
              timestamp: new Date().toISOString(),
              files: backupResult.files || []
            };

            await whatsappService.sendSuccessNotification(
              backupData,
              currentConfig.notifications.whatsapp.recipients,
              currentConfig.clientName || 'Cliente'
            );
          }
        } else {
          const errorMessage = (backupResult && backupResult.error) ? backupResult.error.message :
            (!backupResult) ? 'Erro: função de backup não retornou resultado' :
              'Erro desconhecido no processo de backup.';

          if (!backupResult || backupResult.status !== 'success') {
            logger.error(`❌ Falha no backup agendado #${backupNumber} (status: ${backupResult ? backupResult.status : 'indefinido'})`, { error: errorMessage });
          }

          if (currentConfig.notifications &&
            currentConfig.notifications.smtp &&
            currentConfig.notifications.smtp.enabled &&
            currentConfig.notifications.schedule &&
            currentConfig.notifications.schedule.sendOnFailure &&
            currentConfig.notifications.schedule.recipients &&
            currentConfig.notifications.schedule.recipients.length > 0) {

            const errorData = {
              error: errorMessage,
              details: (backupResult && backupResult.error) ? backupResult.error.stack : 'Detalhes não disponíveis',
              timestamp: new Date().toISOString(),
              databases: currentConfig.database.databases,
              suggestions: [
                'Verifique as configurações de conexão com o SQL Server',
                'Confirme se há espaço suficiente em disco',
                'Verifique os logs da aplicação para mais detalhes'
              ]
            };

            await notificationService.sendFailureNotification(
              errorData,
              currentConfig.notifications.schedule.recipients,
              currentConfig.clientName || 'Cliente'
            );
          }

          if (isWhatsAppEnabled(currentConfig) &&
            currentConfig.notifications.whatsapp.sendOnFailure &&
            currentConfig.notifications.whatsapp.recipients &&
            currentConfig.notifications.whatsapp.recipients.length > 0) {

            const errorData = {
              error: errorMessage,
              details: (backupResult && backupResult.error) ? backupResult.error.stack : 'Detalhes não disponíveis',
              timestamp: new Date().toISOString(),
              databases: currentConfig.database.databases,
              suggestions: [
                'Verifique as configurações de conexão com o SQL Server',
                'Confirme se há espaço suficiente em disco',
                'Verifique os logs da aplicação para mais detalhes'
              ]
            };

            await whatsappService.sendFailureNotification(
              errorData,
              currentConfig.notifications.whatsapp.recipients,
              currentConfig.clientName || 'Cliente'
            );
          }
        }

      } catch (error) {
        logger.error(`❌ Falha catastrófica no backup agendado #${backupNumber}`, error);

        if (currentConfig.notifications &&
          currentConfig.notifications.smtp &&
          currentConfig.notifications.smtp.enabled &&
          currentConfig.notifications.schedule &&
          currentConfig.notifications.schedule.sendOnFailure &&
          currentConfig.notifications.schedule.recipients &&
          currentConfig.notifications.schedule.recipients.length > 0) {

          const errorData = {
            error: error.message || 'Erro desconhecido no backup',
            details: error.stack || 'Detalhes não disponíveis',
            timestamp: new Date().toISOString(),
            databases: currentConfig.database.databases,
            suggestions: [
              'Verifique as configurações de conexão com o SQL Server',
              'Confirme se há espaço suficiente em disco',
              'Verifique os logs da aplicação para mais detalhes'
            ]
          };

          try {
            await notificationService.sendFailureNotification(
              errorData,
              currentConfig.notifications.schedule.recipients,
              currentConfig.clientName || 'Cliente'
            );
          } catch (notificationError) {
            logger.error('❌ Erro ao enviar notificação de falha', notificationError);
          }
        }

        if (isWhatsAppEnabled(currentConfig) &&
          currentConfig.notifications.whatsapp.sendOnFailure &&
          currentConfig.notifications.whatsapp.recipients &&
          currentConfig.notifications.whatsapp.recipients.length > 0) {

          const errorData = {
            error: error.message || 'Erro desconhecido no backup',
            details: error.stack || 'Detalhes não disponíveis',
            timestamp: new Date().toISOString(),
            databases: currentConfig.database.databases,
            suggestions: [
              'Verifique as configurações de conexão com o SQL Server',
              'Confirme se há espaço suficiente em disco',
              'Verifique os logs da aplicação para mais detalhes'
            ]
          };

          try {
            await whatsappService.sendFailureNotification(
              errorData,
              currentConfig.notifications.whatsapp.recipients,
              currentConfig.clientName || 'Cliente'
            );
          } catch (notificationError) {
            logger.error('❌ Erro ao enviar notificação WhatsApp de falha', notificationError);
          }
        }
      }
    });

    scheduledJobs.push(job);
    logger.info(`⏰ Backup agendado para as ${time} (tarefa #${backupNumber})`);
  });
}

function reschedule() {
  scheduledJobs.forEach(job => job.cancel());
  scheduledJobs = [];
  scheduleBackups();
}

function stopScheduler() {
  scheduledJobs.forEach((job, index) => {
    try {
      job.cancel();
    } catch (error) {
      logger.warn(`⚠️ Erro ao cancelar job #${index + 1}:`, error.message);
    }
  });

  scheduledJobs = [];
}

module.exports = {
  scheduleBackups,
  reschedule,
  stopScheduler
}; 