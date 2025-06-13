const express = require('express');

const authRoutes = require('./routes/auth');
const configRoutes = require('./routes/config');
const databaseRoutes = require('./routes/database');
const storageRoutes = require('./routes/storage');
const browseRoutes = require('./routes/browse');
const historyRoutes = require('./routes/history');

const router = express.Router();

router.use('/', authRoutes);

router.use('/', configRoutes);
router.use('/', databaseRoutes);
router.use('/', storageRoutes);
router.use('/browse', browseRoutes);
router.use('/history', historyRoutes);

module.exports = router; 