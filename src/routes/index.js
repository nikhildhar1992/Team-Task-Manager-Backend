const express = require('express');
const authRoutes = require('./authRoutes');
const teamRoutes = require('./teamRoutes');
const taskRoutes = require('./taskRoutes');
const aiRoutes = require('./aiRoutes');
const healthRoutes = require('./healthRoutes');
const userRoutes = require('./userRoutes');
const orderRoutes = require('./orderRoutes');
const knowledgeRoutes = require('./knowledgeRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/teams', teamRoutes);
router.use('/teams', taskRoutes);
router.use('/users', userRoutes);
router.use('/orders', orderRoutes);
router.use('/ai', aiRoutes);
router.use('/knowledge', knowledgeRoutes);
router.use('/health', healthRoutes);

module.exports = router;
