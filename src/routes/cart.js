const express = require('express');
const router = express.Router();
const CartController = require('../controllers/CartController');
const { verifyAnySession, verifyBuyerSession } = require('../middleware/authentication');

// All cart routes require authentication
router.use(verifyBuyerSession);

// Get user's cart
router.get('/', async (req, res, next) => {
	// Return simplified cart for buyer
	try {
		const buyerId = req.session?.buyerId;
		if (!buyerId) return res.status(401).json([]);
		const cartItems = await Cart.getByUserId(buyerId);
		// Map to frontend format
		const items = cartItems.map(item => ({
			productId: item.product_id,
			title: item.name_en,
			price: item.price,
			image: item.image,
			quantity: item.quantity
		}));
		res.json(items);
	} catch (err) {
		next(err);
	}
});

// Get cart summary (count and total)
router.get('/summary', CartController.getSummary);

// Check if product is in cart
router.get('/check/:productId', CartController.checkItem);

// Add item to cart
router.post('/', async (req, res, next) => {
	try {
		const buyerId = req.session?.buyerId;
		if (!buyerId) return res.status(401).json({ error: 'Unauthorized' });
		const { productId, quantity = 1 } = req.body;
		if (!productId) return res.status(400).json({ error: 'Product ID required' });
		await Cart.addItem(buyerId, productId, quantity);
		res.json({ success: true });
	} catch (err) {
		next(err);
	}
});

// Update cart item quantity
router.put('/', async (req, res, next) => {
	try {
		const buyerId = req.session?.buyerId;
		if (!buyerId) return res.status(401).json({ error: 'Unauthorized' });
		const { productId, quantity } = req.body;
		if (!productId || quantity == null) return res.status(400).json({ error: 'Product ID and quantity required' });
		await Cart.updateQuantity(buyerId, productId, quantity);
		res.json({ success: true });
	} catch (err) {
		next(err);
	}
});

// Remove item from cart
router.delete('/', async (req, res, next) => {
	try {
		const buyerId = req.session?.buyerId;
		if (!buyerId) return res.status(401).json({ error: 'Unauthorized' });
		const { productId } = req.body;
		if (!productId) return res.status(400).json({ error: 'Product ID required' });
		await Cart.removeItem(buyerId, productId);
		res.json({ success: true });
	} catch (err) {
		next(err);
	}
});

// Clear entire cart
router.delete('/', CartController.clearCart);

module.exports = router;