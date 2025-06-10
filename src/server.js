const express = require('express');
const path = require('path');
const session = require('express-session');
const logger = require('./utils/logger');
const apiRoutes = require('./api/routes');
const { baseDir, getConfig } = require('./config');

const app = express();
const PORT = process.env.PORT || 3030;

function startServer() {
  const config = getConfig();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use(session({
    secret: config.app.sessionSecret || require('crypto').randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24
    }
  }));

  const publicPath = path.join(baseDir, 'public');

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

  app.listen(PORT, () => {
    logger.info(`Servidor web de configuração rodando em http://localhost:${PORT}`);
  });
}

module.exports = { startServer }; 