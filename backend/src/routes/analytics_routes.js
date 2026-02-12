const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics_controller');
const {verifyToken} = require('../middleware/auth');

router.get('/stats', verifyToken, analyticsController.getStats);
router.post('/run-spark/:option', verifyToken, analyticsController.runSparkJob);
router.post('/run-cluster', verifyToken, analyticsController.runClusterJob);

module.exports = router;
