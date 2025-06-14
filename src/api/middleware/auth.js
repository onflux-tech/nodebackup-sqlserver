const config = require('../../config');

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
  if (!request.session) {
    socket.userId = 'anonymous';
    return next();
  }

  if (!request.session.user) {
    socket.userId = 'anonymous';
    return next();
  }

  socket.userId = request.session.user.id || 'authenticated';
  next();
};

module.exports = { requireAuth, requireSocketAuth }; 