const express = require('express');
const fs = require('fs');
const path = require('path');
const logger = require('../../utils/logger');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/create', requireAuth, (req, res) => {
  const { basePath, newFolderName } = req.body;

  if (!basePath || !newFolderName) {
    return res.status(400).json({ error: 'O caminho base e o nome da nova pasta são obrigatórios.' });
  }

  if (newFolderName.includes('..') || newFolderName.includes('/') || newFolderName.includes('\\')) {
    return res.status(400).json({ error: 'Nome de pasta inválido.' });
  }

  const fullPath = path.join(basePath, newFolderName);
  logger.info(`Tentando criar a pasta: ${fullPath}`);

  try {
    if (fs.existsSync(fullPath)) {
      return res.status(409).json({ error: 'Uma pasta com este nome já existe no local.' });
    }

    fs.mkdirSync(fullPath);
    logger.info(`Pasta criada com sucesso: ${fullPath}`);
    res.status(201).json({ message: 'Pasta criada com sucesso.', path: fullPath });
  } catch (error) {
    logger.error(`Erro ao criar a pasta ${fullPath}`, error);
    res.status(500).json({ error: 'Não foi possível criar a pasta. Verifique as permissões.' });
  }
});

router.get('/drives', requireAuth, (req, res) => {
  const drives = [];
  const driveLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  for (const letter of driveLetters) {
    const drivePath = `${letter}:\\`;
    try {
      if (fs.existsSync(drivePath)) {
        drives.push(drivePath);
      }
    } catch (e) {
      logger.debug(`Erro ao verificar o drive ${drivePath}, pulando.`, e);
    }
  }

  logger.info(`Drives listados com sucesso ${drives.join(', ')}`);
  res.json(drives);
});

router.get('/list', requireAuth, (req, res) => {
  const dirPath = req.query.path || 'C:\\';

  if (!fs.existsSync(dirPath)) {
    return res.status(404).json({ error: 'O caminho não existe ou está inacessível.' });
  }

  try {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    const directories = items
      .filter(item => item.isDirectory())
      .map(item => item.name)
      .sort();
    res.json({ path: dirPath, directories });
  } catch (error) {
    logger.error(`Erro ao listar o diretório ${dirPath}`, error);
    res.status(500).json({ error: 'Não foi possível ler o conteúdo da pasta. Verifique as permissões.' });
  }
});

module.exports = router; 