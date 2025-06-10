const winston = require('winston');
require('winston-daily-rotate-file');
const path = require('path');

const isPkg = typeof process.pkg !== 'undefined';
const baseDir = isPkg ? path.dirname(process.execPath) : process.cwd();

const fileLogFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp }) => {
    return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  })
);

const consoleLogFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format(info => {
    info.level = info.level.toUpperCase();
    return info;
  })(),
  winston.format.colorize(),
  winston.format.printf(({ level, message, timestamp }) => {
    return `[${timestamp}] [${level}] ${message}`;
  })
);

const fileTransport = new winston.transports.DailyRotateFile({
  filename: path.join(baseDir, 'backup-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: false,
  maxSize: '10m',
  maxFiles: '3d',
  tailable: true,
  dirname: path.join(baseDir, 'logs'),
  symlinkName: 'backup.log',
  format: fileLogFormat
});

const consoleTransport = new winston.transports.Console({
  format: consoleLogFormat
});

const logger = winston.createLogger({
  level: 'info',
  transports: [
    fileTransport,
    consoleTransport
  ],
});

module.exports = logger; 