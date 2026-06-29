const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Checkout = require('../models/Checkout');
const Coupon = require('../models/Coupon');
const Referral = require('../models/Referral');
const User = require('../models/User');
const Product = require('../models/Product');
const { pool } = require('../config/database');
const { sendOrderConfirmationEmail } = require('../services/EmailService');
const Stripe = require('stripe');
const stripe = process.env.STRIPE_SECRET_KEY ? Stripe(process.env.STRIPE_SECRET_KEY) : null;

// Allowed French post codes for checkout
const ALLOWED_POSTCODES = [
  '25790',
  '25570',
  '25500',
  '25130',
  '25210',
  '25140',
  '25120',
  '25450',
  '25470'
];

function isPostcodeAllowed(zipCode) {
  if (!zipCode) return false;
  // Remove spaces and normalize
  const normalized = String(zipCode).replace(/\s/g, '').trim();
  return ALLOWED_POSTCODES.includes(normalized);
}

function extractPostcodeFromAddress(address) {
  if (!address) return null;
  // Try to extract from structured format: [street, zipCode, city, country]
  // or from comma-separated address
  const parts = String(address).split(',').map(p => p.trim());
  
  // Look for 5-digit patterns that match our allowed codes
  for (const part of parts) {
    // Check if it's a 5-digit code
    if (/^\d{5}$/.test(part)) {
      return part;
    }
  }
  
  // Fallback: search for any 5-digit sequence in the address
  const match = String(address).match(/\b(\d{5})\b/);
  return match ? match[1] : null;
}

function calculateShippingCost(total) {
  if (typeof total !== 'number' || total <= 0) return 0;
  if (total >= 100) return 0;
  if (total <= 60) return 4.00;
  return 2.00;
}

function calculateShippingMethod(total) {
  if (typeof total !== 'number' || total <= 0) return 'No shipping';
  if (total >= 100) return 'Free delivery';
  if (total <= 60) return 'Delivery up to €60';
  return 'Delivery above €60 and below €100';
}

exports.placeOrder = async (req, res) => {
  let connection;
  try {
    const buyerId = req.session.buyerId;
    const { address, notes, paymentIntentId, referralCode } = req.body;
    console.log('[placeOrder] Request body:', req.body);
    console.log('[placeOrder] Session buyerId:', req.session.buyerId);
    if (!buyerId || !address) return res.status(400).json({ error: 'Missing buyer or address' });
    if (!paymentIntentId) return res.status(400).json({ error: 'Missing paymentIntentId' });

    // Validate post code before proceeding
    const postcode = extractPostcodeFromAddress(address);
    if (!isPostcodeAllowed(postcode)) {
      return res.status(400).json({ 
        error: 'Your post code is not in the allowed delivery zones. Allowed post codes: ' + ALLOWED_POSTCODES.join(', '),
        code: 'POSTCODE_NOT_ALLOWED'
      });
    }

    if (!stripe) return res.status(500).json({ error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.' });

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Get cart items within transaction
    const cartItems = await Cart.getByUserId(buyerId);
    if (!cartItems.length) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Validate stock availability
    for (const item of cartItems) {
      const product = await Product.getById(item.product_id, connection);
      if (!product) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({ error: `Product not found: ${item.product_id}` });
      }
      if ((product.quantity || 0) < item.quantity) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({ error: `Insufficient stock for product ${product.name_en || product.name_fr || item.product_id}` });
      }
    }

    const normalizedCartItems = cartItems.map(item => {
      const basePrice = Number(item.price || 0);
      const promoPrice = Number(item.promo_price || 0);
      const unitPrice = (promoPrice > 0 && promoPrice < basePrice) ? promoPrice : basePrice;
      return { ...item, price: unitPrice };
    });

    const total = normalizedCartItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
    let shippingCost = calculateShippingCost(total);
    let shippingMethod = calculateShippingMethod(total);
    let discountAmount = 0;
    let appliedCouponCode = null;
    let appliedCoupon = null;
    let appliedReferralCode = null;
    let referralDiscount = 0;

    // Apply coupon discount first
    if (req.body.couponCode) {
      try {
        const applyResult = await Coupon.apply(req.body.couponCode, total, shippingCost);
        appliedCouponCode = applyResult.coupon.code;
        appliedCoupon = applyResult.coupon;
        discountAmount = applyResult.freeShipping ? 0 : applyResult.discount;

        if (applyResult.freeShipping) {
          shippingCost = 0;
          shippingMethod = 'Free delivery';
        }
      } catch (couponError) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({ error: couponError.message });
      }
    }

    // Apply referral discount (can be combined with coupon)
    if (referralCode) {
      try {
        // Check if referral is valid for the cart items
        let referralValid = false;
        for (const item of cartItems) {
          const validation = await Referral.isValidForUse(referralCode, item.product_id);
          if (validation.valid) {
            referralValid = true;
            break;
          }
        }

        if (!referralValid) {
          // Try without product restriction
          const validation = await Referral.isValidForUse(referralCode);
          referralValid = validation.valid;
        }

        if (referralValid) {
          const referralResult = await Referral.applyDiscount(referralCode, total - discountAmount);
          referralDiscount = referralResult.discountAmount;
          appliedReferralCode = referralCode;
        } else {
          // Invalid referral code - don't fail the order, just ignore it
          console.log('[placeOrder] Invalid referral code provided:', referralCode);
        }
      } catch (referralError) {
        console.log('[placeOrder] Error applying referral discount:', referralError.message);
        // Don't fail the order for referral errors
      }
    }

    const finalTotal = Number((total + shippingCost - discountAmount - referralDiscount).toFixed(2));

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (!paymentIntent) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ error: 'Invalid payment intent.' });
    }

    if (paymentIntent.status !== 'succeeded') {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ error: 'Payment has not been completed.' });
    }

    if (paymentIntent.amount !== Math.round(finalTotal * 100)) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ error: 'Payment amount does not match order total.' });
    }

    const order = await Order.create({
      buyerId,
      address,
      notes,
      items: normalizedCartItems,
      total: finalTotal,
      couponCode: appliedCouponCode,
      referralCode: appliedReferralCode,
      discountAmount: discountAmount + referralDiscount,
      shippingCost,
      shippingMethod
    }, connection);

    try {
      for (const item of cartItems) {
        await Product.decrementQuantity(item.product_id, item.quantity, connection);
      }

      await Checkout.create({
        orderId: order.id,
        buyerId,
        total: finalTotal,
        currency: 'EUR',
        status: 'completed',
        checkoutUrl: null,
        paymentMethod: 'card'
      }, connection);

      // Decrement coupon uses within transaction
      if (appliedCoupon && appliedCoupon.id) {
        await Coupon.decrementUses(appliedCoupon.id, connection);
      }

      await Cart.clearCart(buyerId, connection);
      await connection.commit();
    } catch (transactionErr) {
      await connection.rollback();
      throw transactionErr;
    } finally {
      connection.release();
    }

    // Send order confirmation email (outside transaction)
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

exports.getOrderBySerial = async (req, res) => {
  try {
    const orderSerial = req.params.serial;
    if (!orderSerial) return res.status(400).json({ error: 'Order serial is required' });
    const order = await Order.getBySerial(orderSerial);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.listOrdersAdmin = async (req, res) => {
  try {
    const orders = await Order.getAllOrders();
    res.json({ success: true, data: orders });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

