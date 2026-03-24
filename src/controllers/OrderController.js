const Order = require('../models/Order');
const Cart = require('../models/Cart');
const User = require('../models/User');
const { sendOrderConfirmationEmail } = require('../services/EmailService');

exports.placeOrder = async (req, res) => {
  try {
    const buyerId = req.session.buyerId;
    const { address, notes } = req.body;
    console.log('[placeOrder] Request body:', req.body);
    console.log('[placeOrder] Session buyerId:', req.session.buyerId);
    if (!buyerId || !address) return res.status(400).json({ error: 'Missing buyer or address' });
    // Get cart items
    const cartItems = await Cart.getByUserId(buyerId);
    if (!cartItems.length) return res.status(400).json({ error: 'Cart is empty' });
    // Calculate total
    const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    // Create order
    const order = await Order.create({ buyerId, address, notes, items: cartItems, total });
    // Clear cart
    await Cart.clearCart(buyerId);

    // Send order confirmation email if buyer email exists
    try {
      const buyer = await User.getById(buyerId);
      if (buyer && buyer.email) {
        await sendOrderConfirmationEmail(buyer.email, order);
      }
    } catch (emailErr) {
      console.error('[OrderController.placeOrder] Error sending order confirmation email:', emailErr);
    }

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.listOrders = async (req, res) => {
  try {
    const buyerId = req.session.buyerId;
    if (!buyerId) return res.status(401).json({ error: 'Unauthorized' });
    const orders = await Order.getByBuyerId(buyerId);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
