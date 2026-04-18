const express = require('express');
const authRoutes = require('./authRoutes');
const teamRoutes = require('./teamRoutes');
const taskRoutes = require('./taskRoutes');
const aiRoutes = require('./aiRoutes');
const healthRoutes = require('./healthRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/teams', teamRoutes);
router.use('/teams', taskRoutes);
router.use('/ai', aiRoutes);
router.use('/health', healthRoutes);

module.exports = router;
