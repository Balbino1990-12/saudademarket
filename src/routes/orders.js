const express = require('express');
const router = express.Router();
const OrderController = require('../controllers/OrderController');
const { verifyBuyerSession } = require('../middleware/authentication');

// Place order
router.post('/', verifyBuyerSession, OrderController.placeOrder);

// Get buyer's orders
router.get('/', verifyBuyerSession, OrderController.listOrders);

module.exports = router;
