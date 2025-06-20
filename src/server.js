const express = require('express');
const http = require('http');
const path = require('path');
const session = require('express-session');
const CustomSessionStore = require('./utils/sessionStore');
const { Server } = require('socket.io');
const logger = require('./utils/logger');
const apiRoutes = require('./api/routes');
const { requireSocketAuth } = require('./api/middleware/auth');
const { baseDir, getConfig } = require('./config');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling']
});
const PORT = process.env.PORT || 3030;

let httpServer;

function createSessionMiddleware() {
  const config = getConfig();

  let sessionSecret = config.app.sessionSecret;

  if (!sessionSecret) {
    const crypto = require('crypto');
    sessionSecret = crypto.randomBytes(64).toString('hex');

    config.app.sessionSecret = sessionSecret;
    const { saveConfig } = require('./config');
    saveConfig();

  }

  return session({
    store: new CustomSessionStore({
      path: path.join(process.cwd(), 'sessions.json'),
      ttl: 60 * 60 * 24 * 7,
      cleanupInterval: 60 * 60 * 6
    }),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    name: 'nodebackup.sid',
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7,
      sameSite: 'strict'
    }
  });
}

function startServer() {
  const config = getConfig();
  const sessionMiddleware = createSessionMiddleware();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(sessionMiddleware);

  io.use((socket, next) => {
    sessionMiddleware(socket.request, {}, next);
  });

  io.use(requireSocketAuth);

  io.on('connection', (socket) => {
    try {
      setTimeout(() => {
        try {
          const recentLogs = logger.logBuffer.getRecentLogs(50);
          socket.emit('logs:history', recentLogs);
        } catch (error) {
          logger.error('Erro ao enviar logs históricos:', error);
        }
      }, 100);

      let activeFilters = {
        levels: ['info', 'warn', 'error'],
        maxEntries: 1000
      };

      const unsubscribe = logger.logBuffer.subscribe((logEntry) => {
        try {
          if (activeFilters.levels.includes(logEntry.level)) {
            socket.emit('logs:new', logEntry);
          }
        } catch (error) {
          logger.error('Erro ao enviar novo log via WebSocket:', error);
        }
      });

      socket.on('logs:setFilters', (filters) => {
        try {
          activeFilters = { ...activeFilters, ...filters };
        } catch (error) {
          logger.error('Erro ao atualizar filtros:', error);
        }
      });

      socket.on('logs:getHistory', (options = {}) => {
        try {
          const count = Math.min(options.count || 100, 1000);
          const levels = options.levels || activeFilters.levels;

          const filteredLogs = logger.logBuffer.getRecentLogs(count * 2)
            .filter(log => levels.includes(log.level))
            .slice(-count);

          socket.emit('logs:history', filteredLogs);
        } catch (error) {
          logger.error('Erro ao enviar logs históricos filtrados:', error);
        }
      });

      socket.on('logs:clear', () => {
        try {
          if (socket.userId === 'anonymous') {
            socket.emit('error', 'Acesso negado para usuários anônimos');
            return;
          }

          logger.logBuffer.clear();
          io.emit('logs:cleared');
          logger.info(`🗑️  Logs limpos pelo usuário ${socket.userId}`);
        } catch (error) {
          logger.error('Erro ao limpar logs:', error);
        }
      });

      socket.on('error', (error) => {
        logger.error(`Erro no WebSocket ${socket.id}:`, error);
      });

      socket.on('disconnect', (reason) => {
        try {
          unsubscribe();
        } catch (error) {
          logger.error('Erro ao fazer cleanup do WebSocket:', error);
        }
      });

    } catch (error) {
      logger.error('Erro ao configurar conexão WebSocket:', error);
      socket.disconnect();
    }
  });

  io.on('error', (error) => {
    logger.error('Erro no servidor Socket.IO:', error);
  });

  const publicPath = path.join(baseDir, 'public');

  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  app.use('/api', apiRoutes);

  app.get('/', (req, res) => {
    const config = getConfig();
    if (config.app.isInitialSetup) {
      return res.redirect('/setup.html');
    }
    if (!req.session.user) {
      return res.redirect('/login.html');
    }
    res.sendFile(path.join(publicPath, 'index.html'));
  });

  app.get('/login.html', (req, res) => {
    const config = getConfig();
    if (config.app.isInitialSetup) {
      return res.redirect('/setup.html');
    }
    if (req.session.user) {
      return res.redirect('/');
    }
    res.sendFile(path.join(publicPath, 'login.html'));
  });

  app.get('/setup.html', (req, res) => {
    const config = getConfig();
    if (!config.app.isInitialSetup) {
      return req.session.user ? res.redirect('/') : res.redirect('/login.html');
    }
    res.sendFile(path.join(publicPath, 'setup.html'));
  });

  app.use(express.static(publicPath));

  app.get('*', (req, res) => {
    if (getConfig().app.isInitialSetup) {
      return res.redirect('/setup.html');
    }
    return req.session.user ? res.redirect('/') : res.redirect('/login.html');
  });

  httpServer = server.listen(PORT, () => {
    logger.info(`🌐 NodeBackup rodando na porta ${PORT}`);
  });

  server.on('error', (error) => {
    logger.error('Erro no servidor HTTP:', error);
  });

  return httpServer;
}

function closeServer() {
  return new Promise((resolve) => {
    if (httpServer) {
      httpServer.close((err) => {
        if (err) {
          logger.error('❌ Erro ao fechar servidor HTTP:', err);
        } else {
          logger.info('✅ Servidor HTTP fechado');
        }
        resolve();
      });
    } else {
      logger.info('ℹ️ Servidor HTTP já estava fechado');
      resolve();
    }
  });
}

module.exports = { startServer, closeServer }; 