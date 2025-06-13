const { getConfig } = require('../../config');

function requireAuth(req, res, next) {
  if (getConfig().app.isInitialSetup) {
    return next();
  }
  if (req.session && req.session.user) {
    return next();
  }
  res.status(401).json({ error: 'Acesso não autorizado. Faça login novamente.' });
}

module.exports = { requireAuth }; 