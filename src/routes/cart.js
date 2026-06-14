const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const CartController = require('../controllers/CartController');
const { verifyAnySession, verifyBuyerSession } = require('../middleware/authentication');

// All cart routes require authentication
router.use(verifyBuyerSession);

// Get user's cart (supports both legacy array and recent {success,data} clients)
router.get('/', CartController.getCart);

// Get cart summary (count and total)
router.get('/summary', CartController.getSummary);

// Add item to cart
router.post('/items', CartController.addItem);
router.post('/add', CartController.addItem);
router.post('/', CartController.addItem);

// Update item quantity
router.put('/items/:productId', CartController.updateItem);
router.put('/', CartController.updateItem);

// Remove item from cart
router.delete('/items/:productId', CartController.removeItem);
router.delete('/', CartController.removeItem);

// Clear cart
router.delete('/clear', CartController.clearCart);

// Check if product is in cart
router.get('/check/:productId', CartController.checkItem);


module.exports = router;
