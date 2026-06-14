const Return = require('../models/Return');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const { sendReturnConfirmationEmail } = require('../services/EmailService');

class ReturnController {
  /**
   * Create a return request
   */
  static async createReturn(req, res) {
    try {
      const buyerId = req.session.buyerId;
      if (!buyerId) return res.status(401).json({ error: 'Unauthorized' });

      const { order_id, product_id, quantity = 1, reason, condition_description } = req.body;

      if (!order_id || !product_id || !reason) {
        return res.status(400).json({ error: 'Order ID, product ID, and reason are required' });
      }

      // Validate return eligibility (including quantity restrictions)
      const canReturn = await Return.canReturn(order_id, product_id, buyerId, quantity);
      if (!canReturn) {
        return res.status(400).json({ error: 'Return not allowed for this order/product/quantity' });
      }

      // Get order and product details for refund calculation
      const order = await Order.getByBuyerId(buyerId).then(orders =>
        orders.find(o => o.id == order_id)
      );
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const product = await Product.getById(product_id);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const orderItem = (order.lineItems || []).find(item => +item.product_id === +product_id);
      if (!orderItem) {
        return res.status(400).json({ error: 'Product not in order items' });
      }

      const refundAmount = Number(orderItem.price || product.price) * quantity;
      const returnData = {
        order_id,
        buyer_id: buyerId,
        product_id,
        quantity,
        reason,
        condition_description,
        status: 'pending',
        refund_amount: refundAmount
      };

      const newReturn = await Return.create(returnData);

      // Send confirmation email
      try {
        const buyer = await User.getById(buyerId);
        if (buyer && buyer.email) {
          await sendReturnConfirmationEmail(buyer.email, newReturn);
        }
      } catch (emailErr) {
        console.error('[ReturnController.createReturn] Error sending return confirmation email:', emailErr);
      }

      res.json({ success: true, return: newReturn });
    } catch (err) {
      console.error('[ReturnController.createReturn] Error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  }

  /**
   * Get buyer's returns
   */
  static async getBuyerReturns(req, res) {
    try {
      const buyerId = req.session.buyerId;
      if (!buyerId) return res.status(401).json({ error: 'Unauthorized' });

      const returns = await Return.getByBuyerId(buyerId);
      res.json(returns);
    } catch (err) {
      console.error('[ReturnController.getBuyerReturns] Error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  }

  /**
   * Get all returns (admin only)
   */
  static async getAllReturns(req, res) {
    try {
      const returns = await Return.getAll();
      res.json({ success: true, data: returns });
    } catch (err) {
      console.error('[ReturnController.getAllReturns] Error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  }

  /**
   * Update return status (admin only)
   */
  static async updateReturnStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, refund_amount, refund_method, admin_notes } = req.body;

      if (!status) {
        return res.status(400).json({ error: 'Status is required' });
      }

      const updateData = {
        status,
        refund_amount: refund_amount || 0,
        refund_method: refund_method || null,
        admin_notes: admin_notes || null
      };

      const existingReturn = await Return.getById(id);
      if (!existingReturn) {
        return res.status(404).json({ error: 'Return request not found' });
      }

      const currentStatus = existingReturn.status;
      const nextStatus = status;
      const allowedTransitions = {
        pending: ['approved', 'rejected'],
        approved: ['received'],
        received: ['refunded', 'exchanged'],
        rejected: [],
        refunded: [],
        exchanged: []
      };

      if (!allowedTransitions[currentStatus] || !allowedTransitions[currentStatus].includes(nextStatus)) {
        return res.status(400).json({ error: `Invalid status transition from ${currentStatus} to ${nextStatus}` });
      }

      if (nextStatus === 'received') {
        try {
          await Product.incrementQuantity(existingReturn.product_id, existingReturn.quantity);
          console.log('[ReturnController.updateReturnStatus] Stock restored for product', existingReturn.product_id, 'quantity', existingReturn.quantity);
        } catch (stockErr) {
          console.error('[ReturnController.updateReturnStatus] Failed to restore stock:', stockErr);
          return res.status(500).json({ error: 'Failed to restore stock for returned product' });
        }
      }

      const updatedReturn = await Return.update(id, updateData);

      // If status is 'refunded', we might want to process the payment refund here (future integration)

      res.json({ success: true, return: updatedReturn });
    } catch (err) {
      console.error('[ReturnController.updateReturnStatus] Error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  }

  /**
   * Get return by ID
   */
  static async getReturn(req, res) {
    try {
      const { id } = req.params;
      const returnData = await Return.getById(id);

      if (!returnData) {
        return res.status(404).json({ error: 'Return not found' });
      }

      res.json({ success: true, return: returnData });
    } catch (err) {
      console.error('[ReturnController.getReturn] Error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  }

  /**
   * Check if a return is allowed for an order/product
   */
  static async checkReturnEligibility(req, res) {
    try {
      const buyerId = req.session.buyerId;
      if (!buyerId) return res.status(401).json({ error: 'Unauthorized' });

      const { order_id, product_id } = req.params;

      if (!order_id || !product_id) {
        return res.status(400).json({ error: 'Order ID and product ID are required' });
      }

      const canReturn = await Return.canReturn(order_id, product_id, buyerId);
      res.json({ canReturn });
    } catch (err) {
      console.error('[ReturnController.checkReturnEligibility] Error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  }
}

module.exports = ReturnController;