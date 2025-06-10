const schedule = require('node-schedule');
const logger = require('../utils/logger');
const { getConfig } = require('../config');
const { performBackup } = require('./database');

let scheduledJobs = [];

function startScheduler() {
  cancelJobs();
  logger.log('Iniciando o agendador de backups.');

  const config = getConfig();
  const scheduleListRaw = config.backupSchedule || [];
  const scheduleList = [...new Set(scheduleListRaw)];

  const dbList = (config.database && config.database.databases) || [];
  const dbConfig = config.database;
  const ftpConfig = config.ftp;

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

  scheduleList.forEach(time => {
    const [hour, minute] = time.split(':');
    const rule = new schedule.RecurrenceRule();
    rule.hour = parseInt(hour, 10);
    rule.minute = parseInt(minute, 10);
    rule.tz = 'local';

    const job = schedule.scheduleJob(rule, () => {
      logger.log(`Disparando backup agendado para as ${time}. Bancos: ${dbList.join(', ')}`);
      dbList.forEach(dbName => {
        performBackup(dbName, dbConfig, ftpConfig);
      });
    });

    if (job) {
      scheduledJobs.push(job);
      logger.log(`Backup agendado para ${time}.`);
    } else {
      logger.error(`Falha ao agendar backup para as ${time}.`);
    }
  });

  logger.log('Agendador de backups configurado e rodando.');
}

function cancelJobs() {
  logger.log('Cancelando todos os trabalhos de backup agendados.');
  scheduledJobs.forEach(job => job.cancel());
  scheduledJobs = [];
}

function reschedule() {
  logger.log('Recebida solicitação para reagendar os backups.');
  cancelJobs();
  startScheduler();
}

module.exports = {
  startScheduler,
  reschedule,
}; 