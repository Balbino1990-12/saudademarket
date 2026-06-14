const Checkout = require('../models/Checkout');
const Cart = require('../models/Cart');
const Coupon = require('../models/Coupon');
const { geocodeAddress, isPointAllowed } = require('../middleware/geofence');
const Stripe = require('stripe');
const stripe = process.env.STRIPE_SECRET_KEY ? Stripe(process.env.STRIPE_SECRET_KEY) : null;

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

class CheckoutController {
  static async createPaymentIntent(req, res) {
    try {
      if (!stripe) return res.status(500).json({ error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.' });

      const buyerId = req.session?.buyerId;
      if (!buyerId) return res.status(401).json({ error: 'Unauthorized' });

      const { couponCode = null } = req.body;

      const cartItems = await Cart.getByUserId(buyerId);
      if (!Array.isArray(cartItems) || cartItems.length === 0) {
        return res.status(400).json({ error: 'Cart is empty' });
      }

      const total = cartItems.reduce((sum, item) => {
        const basePrice = Number(item.price || item.unit_price || 0);
        const promoPrice = Number(item.promo_price || 0);
        const unitPrice = (promoPrice > 0 && promoPrice < basePrice) ? promoPrice : basePrice;
        return sum + unitPrice * Number(item.quantity || 0);
      }, 0);
      let shippingCost = calculateShippingCost(total);
      let shippingMethod = calculateShippingMethod(total);
      let discountAmount = 0;
      let appliedCouponCode = null;
      let appliedCoupon = null;

      if (couponCode) {
        try {
          const applyResult = await Coupon.apply(couponCode, total, shippingCost);
          discountAmount = applyResult.discount;
          appliedCouponCode = applyResult.coupon.code;
          appliedCoupon = applyResult.coupon;
        } catch (couponError) {
          return res.status(400).json({ error: couponError.message });
        }
      }

      if (appliedCoupon && appliedCoupon.type === 'free_shipping') {
        shippingCost = 0;
        shippingMethod = 'Free delivery';
      }

      const finalTotal = Number((total + shippingCost - discountAmount).toFixed(2));
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(finalTotal * 100),
        currency: 'eur',
        metadata: {
          buyerId: String(buyerId),
          shippingMethod: String(shippingMethod),
          couponCode: appliedCouponCode || '',
          paymentFlow: 'order'
        },
        description: 'Saudade Market order payment',
        payment_method_types: ['card']
      });

      res.json({ success: true, clientSecret: paymentIntent.client_secret, amount: finalTotal, paymentIntentId: paymentIntent.id });
    } catch (err) {
      console.error('[CheckoutController.createPaymentIntent] Error:', err);
      res.status(500).json({ error: 'Unable to create payment intent.' });
    }
  }

  static async validateAddress(req, res) {
    try {
      const buyerId = req.session?.buyerId;
      if (!buyerId) return res.status(401).json({ error: 'Unauthorized' });

      const body = req.body || {};
      const address = body.address || [body.street, body.zipCode, body.city, body.country].filter(Boolean).join(', ');
      const lat = body.lat || body.latitude;
      const lng = body.lng || body.longitude;

      if ((lat == null || lng == null) && !address) {
        return res.status(400).json({ error: 'Please provide an address or latitude/longitude for delivery validation.' });
      }

      let coords = { lat, lng };
      if ((coords.lat == null || coords.lng == null) && address) {
        coords = await geocodeAddress(address);
      }

      if (coords.lat == null || coords.lng == null) {
        return res.status(400).json({ error: 'Unable to resolve delivery coordinates from the provided address.' });
      }

      const allowed = isPointAllowed(coords.lat, coords.lng);
      const message = allowed ? 'Your zone is allowed' : 'Your area is outside of allowed zones';
      return res.json({ allowed, message, coords, source: coords.source || 'direct' });
    } catch (err) {
      console.error('[CheckoutController.validateAddress] Error:', err);
      return res.status(500).json({ error: err.message || 'Address validation failed' });
    }
  }

  static async createCheckout(req, res) {
    try {
      const buyerId = req.session?.buyerId;
      if (!buyerId) return res.status(401).json({ error: 'Unauthorized' });

      const { orderId = null, total = 0, currency = 'EUR', status = 'pending', checkoutUrl = null, paymentMethod = null } = req.body;
      const checkout = await Checkout.create({ orderId, buyerId, total, currency, status, checkoutUrl, paymentMethod });
      res.json({ success: true, data: checkout });
    } catch (err) {
      console.error('[CheckoutController.createCheckout] Error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  }

  static async listCheckout(req, res) {
    try {
      const buyerId = req.session?.buyerId;
      if (!buyerId) return res.status(401).json({ error: 'Unauthorized' });

      const checkouts = await Checkout.getByBuyerId(buyerId);
      res.json({ success: true, data: checkouts });
    } catch (err) {
      console.error('[CheckoutController.listCheckout] Error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  }

  static async getCheckout(req, res) {
    try {
      const buyerId = req.session?.buyerId;
      if (!buyerId) return res.status(401).json({ error: 'Unauthorized' });

      const { id } = req.params;
      const checkout = await Checkout.getById(id);
      if (!checkout || checkout.buyer_id !== buyerId) return res.status(404).json({ error: 'Checkout not found' });

      res.json({ success: true, data: checkout });
    } catch (err) {
      console.error('[CheckoutController.getCheckout] Error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  }

  static async updateStatus(req, res) {
    try {
      const buyerId = req.session?.buyerId;
      if (!buyerId) return res.status(401).json({ error: 'Unauthorized' });

      const { id } = req.params;
      const { status } = req.body;
      const checkout = await Checkout.getById(id);
      if (!checkout || checkout.buyer_id !== buyerId) return res.status(404).json({ error: 'Checkout not found' });

      const updated = await Checkout.updateStatus(id, status);
      res.json({ success: true, data: updated });
    } catch (err) {
      console.error('[CheckoutController.updateStatus] Error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  }
}

module.exports = CheckoutController;
