const schedule = require('node-schedule');
const logger = require('../utils/logger');
const { getConfig } = require('../config');
const { performConsolidatedBackup } = require('./database');

let scheduledJobs = [];

function scheduleBackups() {
  const initialConfig = getConfig();
  if (!initialConfig || !initialConfig.backupSchedule) {
    logger.warn('Agendamento de backups pulado: configuração de horários não encontrada.');
    return;
  }

  initialConfig.backupSchedule.forEach((time, index) => {
    const [hour, minute] = time.split(':');
    const rule = new schedule.RecurrenceRule();
    rule.hour = parseInt(hour, 10);
    rule.minute = parseInt(minute, 10);

    const backupNumber = index + 1;

    const job = schedule.scheduleJob(rule, () => {
      const currentConfig = getConfig();
      if (!currentConfig || !currentConfig.database || !currentConfig.database.databases || currentConfig.database.databases.length === 0) {
        logger.warn(`Backup para o horário ${time} pulado: nenhum banco de dados selecionado na configuração atual.`);
        return;
      }

      logger.info(`Disparando backup consolidado #${backupNumber} para as ${time}. Bancos: ${currentConfig.database.databases.join(', ')}`);

      performConsolidatedBackup(
        currentConfig.database.databases,
        currentConfig.clientName,
        backupNumber,
        currentConfig.database,
        currentConfig.storage,
        currentConfig.retention
      );
    });

    scheduledJobs.push(job);
    logger.info(`Backup agendado para as ${time} (tarefa #${backupNumber})`);
  });
}

function reschedule() {
  logger.info('Cancelando todos os agendamentos existentes para recarregar as configurações...');
  scheduledJobs.forEach(job => job.cancel());
  scheduledJobs = [];
  logger.info('Agendamentos antigos cancelados.');
  scheduleBackups();
}

module.exports = {
  scheduleBackups,
  reschedule
}; 