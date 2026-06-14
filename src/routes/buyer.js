const express = require('express');
const router = express.Router();
const BuyerController = require('../controllers/BuyerController');
const { verifyBuyerSession } = require('../middleware/authentication');

// Get buyer profile
router.get('/profile', verifyBuyerSession, BuyerController.getProfile);

// Update buyer profile
router.put('/profile', verifyBuyerSession, BuyerController.updateProfile);

module.exports = router;

