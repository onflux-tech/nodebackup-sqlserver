const config = require('../../config');
const logger = require('../../utils/logger');

const requireAuth = (req, res, next) => {
  const currentConfig = config.getConfig();

  if (currentConfig.app.isInitialSetup) {
    return next();
  }

  if (!req.session.user) {
    return res.status(401).json({ error: 'Acesso negado' });
  }

  next();
};

const requireSocketAuth = (socket, next) => {
  const currentConfig = config.getConfig();

  if (currentConfig.app.isInitialSetup) {
    socket.userId = 'setup';
    return next();
  }

  const request = socket.request;
  if (!request.session || !request.session.user) {
    const error = new Error('Unauthorized - WebSocket access denied');
    error.data = {
      message: 'Acesso WebSocket negado. Faça login primeiro.',
      code: 'WEBSOCKET_AUTH_REQUIRED'
    };

    logger.warn(`🚫 Tentativa de acesso WebSocket não autorizado - IP: ${socket.handshake.address}`);
    return next(error);
  }

  socket.userId = request.session.user.id || request.session.user.username || 'authenticated';
  socket.userName = request.session.user.username || 'usuário';

  logger.debug(`✅ WebSocket autenticado: ${socket.userName} (${socket.userId})`);
  next();
};

module.exports = { requireAuth, requireSocketAuth }; 