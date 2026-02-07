const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics_controller');
const verifyToken = require('../middleware/auth');

router.get('/stats', verifyToken, analyticsController.getStats);

module.exports = router;
