const express = require('express');
const router = express.Router();
const AnalyticsController = require('../controllers/AnalyticsController');
const { verifyAdminSession } = require('../middleware/authentication');

// Public pageview tracking endpoint
router.post('/pageview', AnalyticsController.recordPageView);

// Admin analytics summary endpoint
router.get('/summary', verifyAdminSession, AnalyticsController.getAnalyticsSummary);

module.exports = router;
