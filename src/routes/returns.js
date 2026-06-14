const express = require('express');
const router = express.Router();
const ReturnController = require('../controllers/ReturnController');
const { verifyBuyerSession, verifyAdminSession } = require('../middleware/authentication');

// Buyer routes
router.post('/', verifyBuyerSession, ReturnController.createReturn);
router.get('/', verifyBuyerSession, ReturnController.getBuyerReturns);
router.get('/eligibility/:order_id/:product_id', verifyBuyerSession, ReturnController.checkReturnEligibility);

// Admin routes
router.get('/admin', verifyAdminSession, ReturnController.getAllReturns);
router.get('/:id', verifyAdminSession, ReturnController.getReturn);
router.put('/:id/status', verifyAdminSession, ReturnController.updateReturnStatus);

module.exports = router;