const express = require('express');
const bcrypt = require('bcryptjs');
const { getConfig, setConfig, saveConfig } = require('../../config');
const { requireAuth } = require('../middleware/auth');
const logger = require('../../utils/logger');

const router = express.Router();

router.post('/setup', (req, res) => {
  const config = getConfig();
  if (!config.app.isInitialSetup) {
    logger.warn('🔒 Tentativa de setup após configuração inicial já realizada');
    return res.status(403).json({ message: 'A configuração inicial já foi realizada.' });
  }

  const { username, password } = req.body;
  if (!username || !password || password.length < 6) {
    logger.warn('🔒 Tentativa de setup com dados inválidos');
    return res.status(400).json({ message: 'Usuário e senha (mínimo 6 caracteres) são obrigatórios.' });
  }

  const salt = bcrypt.genSaltSync(10);
  config.app.username = username;
  config.app.password = bcrypt.hashSync(password, salt);
  config.app.isInitialSetup = false;

  setConfig(config);
  if (saveConfig()) {
    logger.info(`✅ Conta de administrador criada com sucesso: ${username}`);
    res.status(200).json({ message: 'Conta de administrador criada com sucesso.' });
  } else {
    logger.error('❌ Erro ao salvar configuração durante setup');
    res.status(500).json({ message: 'Erro ao salvar a configuração.' });
  }
});

router.post('/change-password', requireAuth, (req, res) => {
  const { username, oldPassword, newPassword, confirmNewPassword } = req.body;
  const config = getConfig();

  if (config.app.isInitialSetup) {
    logger.warn('🔒 Tentativa de mudança de senha durante setup inicial');
    return res.status(403).json({ message: 'Execute a configuração inicial primeiro.' });
  }

  if (newPassword !== confirmNewPassword) {
    logger.warn(`🔒 Tentativa de mudança de senha com confirmação incorreta - User: ${username}`);
    return res.status(400).json({ message: 'As novas senhas não coincidem.' });
  }

  if (newPassword.length < 6) {
    logger.warn(`🔒 Tentativa de mudança de senha muito curta - User: ${username}`);
    return res.status(400).json({ message: 'A nova senha deve ter pelo menos 6 caracteres.' });
  }

  const storedUser = config.app.username;
  const storedHash = config.app.password;

  if (username === storedUser && bcrypt.compareSync(oldPassword, storedHash)) {
    const salt = bcrypt.genSaltSync(10);
    config.app.password = bcrypt.hashSync(newPassword, salt);
    setConfig(config);
    if (saveConfig()) {
      res.status(200).json({ message: 'Senha alterada com sucesso.' });
    } else {
      logger.error(`❌ Erro ao salvar nova senha - User: ${username}`);
      res.status(500).json({ message: 'Erro ao salvar a nova senha.' });
    }
  } else {
    logger.warn(`🔒 Tentativa de mudança de senha com credenciais incorretas - User: ${username}`);
    res.status(401).json({ message: 'Usuário ou senha antiga incorretos.' });
  }
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const config = getConfig();

  if (!username || !password) {
    logger.warn('🔒 Tentativa de login sem credenciais');
    return res.status(400).json({ message: 'Usuário e senha são obrigatórios.' });
  }

  const storedUser = config.app.username;
  const storedHash = config.app.password;

  if (username === storedUser && bcrypt.compareSync(password, storedHash)) {
    try {
      req.session.user = {
        username: storedUser,
        loginTime: new Date().toISOString(),
        id: storedUser
      };

      req.session.save((err) => {
        if (err) {
          logger.error('❌ Erro ao salvar sessão após login:', err);
          return res.status(500).json({ message: 'Erro interno do servidor.' });
        }

        res.status(200).json({ message: 'Login bem-sucedido.' });
      });

    } catch (error) {
      logger.error('❌ Erro durante processo de login:', error);
      res.status(500).json({ message: 'Erro interno do servidor.' });
    }
  } else {
    logger.warn(`🔒 Tentativa de login com credenciais inválidas - User: ${username}`);
    res.status(401).json({ message: 'Usuário ou senha inválidos.' });
  }
});

router.post('/logout', requireAuth, (req, res) => {
  const username = req.session.user.username || 'unknown';
  const sessionId = req.sessionID;

  req.session.destroy(err => {
    if (err) {
      logger.error(`❌ Erro ao fazer logout - User: ${username}, Session: ${sessionId}`, err);
      return res.status(500).json({ message: 'Não foi possível fazer logout.' });
    }

    res.clearCookie('connect.sid');
    res.status(200).json({ message: 'Logout bem-sucedido.' });
  });
});

router.get('/status', (req, res) => {
  const config = getConfig();

  if (config.app.isInitialSetup) {
    return res.json({
      authenticated: false,
      setup: false,
      message: 'Setup inicial necessário'
    });
  }

  if (req.session.user) {
    return res.json({
      authenticated: true,
      setup: true,
      user: req.session.user.username,
      sessionId: req.sessionID,
      loginTime: req.session.user.loginTime
    });
  }

  res.json({
    authenticated: false,
    setup: true,
    message: 'Não autenticado'
  });
});

module.exports = router; 