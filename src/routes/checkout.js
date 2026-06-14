const express = require('express');
const router = express.Router();
const CheckoutController = require('../controllers/CheckoutController');
const { verifyBuyerSession } = require('../middleware/authentication');

router.post('/validate', verifyBuyerSession, CheckoutController.validateAddress);
router.post('/intent', verifyBuyerSession, CheckoutController.createPaymentIntent);
router.post('/', verifyBuyerSession, CheckoutController.createCheckout);
router.get('/', verifyBuyerSession, CheckoutController.listCheckout);
router.get('/:id', verifyBuyerSession, CheckoutController.getCheckout);
router.put('/:id/status', verifyBuyerSession, CheckoutController.updateStatus);

module.exports = router;
