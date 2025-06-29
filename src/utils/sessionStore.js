const fs = require('fs');
const path = require('path');
const { Store } = require('express-session');
const logger = require('./logger');

class CustomSessionStore extends Store {
  constructor(options = {}) {
    super(options);

    this.options = {
      ttl: options.ttl || 60 * 60 * 24 * 7,
      path: options.path || path.join(process.cwd(), 'sessions.json'),
      maxFileSize: options.maxFileSize || 10 * 1024 * 1024, // 10MB por padrão
      ...options
    };

    this.sessions = Object.create(null);
    this.saveQueue = null;
    this.load();

    setInterval(() => {
      this.cleanup();
    }, 60 * 60 * 1000);
  }

  get(sessionId, callback) {
    defer(this, callback, 'get', sessionId);
  }

  set(sessionId, session, callback) {
    this.sessions[sessionId] = JSON.stringify(session);
    this.scheduleSave();
    defer(this, callback, 'set', sessionId, session);
  }

  destroy(sessionId, callback) {
    delete this.sessions[sessionId];
    this.scheduleSave();
    defer(this, callback, 'destroy', sessionId);
  }

  touch(sessionId, session, callback) {
    const currentSession = this.sessions[sessionId];
    if (currentSession) {
      this.sessions[sessionId] = JSON.stringify(session);
      this.scheduleSave();
    }
    defer(this, callback, 'touch', sessionId, session);
  }

  _get(sessionId, callback) {
    const session = this.sessions[sessionId];
    if (!session) {
      return callback();
    }

    try {
      const result = JSON.parse(session);
      callback(null, result);
    } catch (err) {
      callback(err);
    }
  }

  _set(sessionId, session, callback) {
    callback && callback();
  }

  _destroy(sessionId, callback) {
    callback && callback();
  }

  _touch(sessionId, session, callback) {
    callback && callback();
  }

  cleanup() {
    try {
      let changed = false;
      const now = Date.now();

      for (const sessionId in this.sessions) {
        try {
          const session = JSON.parse(this.sessions[sessionId]);
          if (session.cookie && session.cookie.expires && new Date(session.cookie.expires) < now) {
            delete this.sessions[sessionId];
            changed = true;
          }
        } catch (err) {
          delete this.sessions[sessionId];
          changed = true;
        }
      }

      if (changed) {
        this.save();
        logger.debug('Sessões expiradas removidas');
      }
    } catch (error) {
      logger.error('Erro na limpeza de sessões:', error);
    }
  }

  load() {
    try {
      if (fs.existsSync(this.options.path)) {
        const stats = fs.statSync(this.options.path);
        
        // Verificar tamanho do arquivo
        if (stats.size > this.options.maxFileSize) {
          logger.warn(`Arquivo de sessões muito grande (${(stats.size / 1024 / 1024).toFixed(2)}MB). Iniciando novo arquivo.`);
          this.sessions = Object.create(null);
          return;
        }
        
        const data = fs.readFileSync(this.options.path, 'utf8');
        this.sessions = JSON.parse(data) || Object.create(null);

        this.cleanup();

        logger.debug(`${Object.keys(this.sessions).length} sessões carregadas`);
      }
    } catch (error) {
      logger.warn('Erro ao carregar sessões, iniciando vazio:', error.message);
      this.sessions = Object.create(null);
    }
  }

  scheduleSave() {
    if (this.saveQueue) {
      clearTimeout(this.saveQueue);
    }
    
    this.saveQueue = setTimeout(() => {
      this.save();
    }, 1000); // Aguarda 1 segundo antes de salvar para agrupar mudanças
  }

  save() {
    const tempPath = this.options.path + '.tmp';
    
    try {
      // Usar writeFile assíncrono em vez de writeFileSync
      const data = JSON.stringify(this.sessions, null, 2);
      
      // Verificar tamanho antes de salvar
      if (Buffer.byteLength(data, 'utf8') > this.options.maxFileSize) {
        logger.warn('Dados de sessão excedem tamanho máximo. Executando limpeza forçada.');
        this.cleanup();
        return;
      }
      
      fs.writeFile(tempPath, data, (writeErr) => {
        if (writeErr) {
          logger.error('Erro ao escrever arquivo temporário de sessões:', writeErr);
          return;
        }
        
        // Renomear arquivo atomicamente
        fs.rename(tempPath, this.options.path, (renameErr) => {
          if (renameErr) {
            logger.error('Erro ao renomear arquivo de sessões:', renameErr);
            // Tentar limpar arquivo temporário
            fs.unlink(tempPath, () => {});
          }
        });
      });
    } catch (error) {
      logger.error('Erro ao salvar sessões:', error);
      
      // Tentar limpar arquivo temporário se existir
      fs.unlink(tempPath, () => {});
    }
  }

  length(callback) {
    defer(this, callback, 'length');
  }

  _length(callback) {
    callback && callback(null, Object.keys(this.sessions).length);
  }

  clear(callback) {
    defer(this, callback, 'clear');
  }

  _clear(callback) {
    this.sessions = Object.create(null);
    this.scheduleSave();
    callback && callback();
  }

  all(callback) {
    defer(this, callback, 'all');
  }

  _all(callback) {
    try {
      const sessions = [];
      for (const sessionId in this.sessions) {
        try {
          const session = JSON.parse(this.sessions[sessionId]);
          sessions.push({ sessionId, ...session });
        } catch (err) {
        }
      }
      callback && callback(null, sessions);
    } catch (error) {
      callback && callback(error);
    }
  }
}

function defer(store, callback, method, ...args) {
  if (typeof callback !== 'function') {
    return;
  }

  const fn = store['_' + method];
  if (!fn) {
    return callback();
  }

  setImmediate(() => {
    try {
      fn.call(store, ...args, callback);
    } catch (err) {
      callback(err);
    }
  });
}

module.exports = CustomSessionStore; 