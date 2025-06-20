const winston = require('winston');
require('winston-daily-rotate-file');
const path = require('path');

const isPkg = typeof process.pkg !== 'undefined';
const baseDir = isPkg ? path.dirname(process.execPath) : process.cwd();

class LogBuffer {
  constructor(maxSize = 10000) {
    this.buffer = new Array(maxSize);
    this.head = 0;
    this.tail = 0;
    this.size = 0;
    this.maxSize = maxSize;
    this.subscribers = new Set();

    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleSubscribers();
    }, 300000);
  }

  addLog(logEntry) {
    if (!logEntry.id) {
      logEntry.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

    logEntry._index = this.tail;

    this.buffer[this.tail] = logEntry;
    this.tail = (this.tail + 1) % this.maxSize;

    if (this.size < this.maxSize) {
      this.size++;
    } else {
      this.head = (this.head + 1) % this.maxSize;
    }

    this.notifySubscribers(logEntry);
  }

  notifySubscribers(logEntry) {
    if (this.subscribers.size === 0) return;

    const deadSubscribers = [];

    for (const callback of this.subscribers) {
      try {
        callback(logEntry);
      } catch (error) {
        console.error('Erro ao enviar log para subscriber:', error);
        deadSubscribers.push(callback);
      }
    }

    deadSubscribers.forEach(callback => this.subscribers.delete(callback));
  }

  subscribe(callback) {
    if (typeof callback !== 'function') {
      throw new Error('Callback deve ser uma função');
    }

    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  getRecentLogs(count = 100) {
    const logs = [];
    const actualCount = Math.min(count, this.size);

    if (actualCount === 0) return logs;

    for (let i = 0; i < actualCount; i++) {
      const index = (this.head + this.size - actualCount + i) % this.maxSize;
      if (this.buffer[index]) {
        logs.push(this.buffer[index]);
      }
    }

    return logs;
  }

  clear() {
    this.buffer = new Array(this.maxSize);
    this.head = 0;
    this.tail = 0;
    this.size = 0;

    this.notifySubscribers({
      level: 'info',
      message: 'Buffer de logs limpo',
      timestamp: new Date().toISOString(),
      id: 'clear_' + Date.now()
    });
  }

  cleanupStaleSubscribers() {
    if (this.subscribers.size > 100) {
      console.warn(`⚠️ Muitos subscribers ativos: ${this.subscribers.size}`);
    }

  }

  getStats() {
    return {
      size: this.size,
      maxSize: this.maxSize,
      subscribers: this.subscribers.size,
      memoryUsageApprox: this.size * 200
    };
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.clear();
    this.subscribers.clear();
  }
}

const logBuffer = new LogBuffer(10000);

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