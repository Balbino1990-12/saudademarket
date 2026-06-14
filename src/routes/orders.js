const express = require('express');
const router = express.Router();
const OrderController = require('../controllers/OrderController');
const { verifyBuyerSession } = require('../middleware/authentication');

// Place order
router.post('/', verifyBuyerSession, OrderController.placeOrder);

// Get buyer's orders
router.get('/', verifyBuyerSession, OrderController.listOrders);

// Public order lookup by serial (used by QR scan)
router.get('/serial/:serial', OrderController.getOrderBySerial);

module.exports = router;

