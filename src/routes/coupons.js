const express = require('express');
const router = express.Router();
const CouponController = require('../controllers/CouponController');
const { verifyBuyerSession } = require('../middleware/authentication');

router.post('/validate', verifyBuyerSession, CouponController.validateCoupon);

module.exports = router;
