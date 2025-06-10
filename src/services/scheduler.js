const schedule = require('node-schedule');
const logger = require('../utils/logger');
const { getConfig } = require('../config');
const { performConsolidatedBackup } = require('./database');

let scheduledJobs = [];

function startScheduler() {
  cancelJobs();
  logger.info('Iniciando o agendador de backups.');

  const config = getConfig();
  const scheduleListRaw = config.backupSchedule || [];
  const scheduleList = [...new Set(scheduleListRaw)];

  const dbList = (config.database && config.database.databases) || [];
  const dbConfig = config.database;
  const ftpConfig = config.ftp;
  const clientName = config.clientName || 'Backup';

  if (scheduleList.length === 0) {
    logger.warn('Nenhum horário de backup configurado. O agendador não iniciará jobs.');
    return;
  }
  if (dbList.length === 0) {
    logger.warn('Nenhum banco de dados selecionado. O agendador não iniciará jobs.');
    return;
  }

  if (scheduleList.length > 0 && scheduleListRaw.length !== scheduleList.length) {
    logger.warn(`Horários de backup duplicados foram removidos. Agendamentos ativos: ${scheduleList.join(', ')}`);
  }

  scheduleList.forEach((time, index) => {
    const [hour, minute] = time.split(':');
    const rule = new schedule.RecurrenceRule();
    rule.hour = parseInt(hour, 10);
    rule.minute = parseInt(minute, 10);
    rule.tz = 'local';

    const backupNumber = index + 1;

    const job = schedule.scheduleJob(rule, () => {
      logger.info(`Disparando backup consolidado #${backupNumber} para as ${time}. Bancos: ${dbList.join(', ')}`);
      performConsolidatedBackup(dbList, clientName, backupNumber, dbConfig, ftpConfig);
    });

    if (job) {
      scheduledJobs.push(job);
      logger.info(`Backup agendado para ${time}.`);
    } else {
      logger.error(`Falha ao agendar backup para as ${time}.`);
    }
  });

  logger.info('Agendador de backups configurado e rodando.');
}

function cancelJobs() {
  if (scheduledJobs.length > 0) {
    logger.info('Cancelando todos os trabalhos de backup agendados.');
    scheduledJobs.forEach(job => job.cancel());
    scheduledJobs = [];
  }
}

function reschedule() {
  logger.info('Recebendo novas configurações, reagendando os backups...');
  startScheduler();
}

module.exports = {
  startScheduler,
  reschedule,
}; 