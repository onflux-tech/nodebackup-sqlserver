const winston = require('winston');
require('winston-daily-rotate-file');
const path = require('path');

const isPkg = typeof process.pkg !== 'undefined';
const baseDir = isPkg ? path.dirname(process.execPath) : process.cwd();

class LogBuffer {
  constructor(maxSize = 1000) {
    this.buffer = [];
    this.maxSize = maxSize;
    this.subscribers = new Set();
  }

  addLog(logEntry) {
    if (this.buffer.length >= this.maxSize) {
      this.buffer.shift();
    }
    this.buffer.push(logEntry);

    this.subscribers.forEach(callback => {
      try {
        callback(logEntry);
      } catch (error) {
        console.error('Erro ao enviar log para subscriber:', error);
      }
    });
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  getRecentLogs(count = 100) {
    return this.buffer.slice(-count);
  }

  clear() {
    this.buffer = [];
  }
}

const logBuffer = new LogBuffer(1000);

class BroadcastTransport extends winston.Transport {
  constructor(opts = {}) {
    super(opts);
    this.name = 'broadcast';
  }

  log(info, callback) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: info.level,
      message: info.message,
      id: Date.now() + Math.random()
    };

    logBuffer.addLog(logEntry);

    callback();
  }
}

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

const broadcastTransport = new BroadcastTransport();

const logger = winston.createLogger({
  level: 'info',
  transports: [
    fileTransport,
    consoleTransport,
    broadcastTransport
  ],
});

logger.logBuffer = logBuffer;

module.exports = logger; 