const Coupon = require('../models/Coupon');

class CouponController {
  static parseDecimal(value) {
    if (value === undefined || value === null || value === '') return null;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  static parseInteger(value) {
    if (value === undefined || value === null || value === '') return null;
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }

  static async validateCoupon(req, res) {
    try {
      const buyerId = req.session?.buyerId;
      if (!buyerId) return res.status(401).json({ error: 'Unauthorized' });

      let { code, orderTotal, shippingCost } = req.body;
      code = typeof code === 'string' ? code.trim() : '';
      orderTotal = Number(orderTotal);
      shippingCost = Number(shippingCost || 0);
      if (!code || Number.isNaN(orderTotal)) {
        return res.status(400).json({ error: 'Coupon code and valid orderTotal are required' });
      }

      const result = await Coupon.apply(code, orderTotal, shippingCost);
      res.json({ success: true, data: { code: result.coupon.code, discount: result.discount, freeShipping: result.freeShipping, usesLeft: result.usesLeft, totalAfterDiscount: result.totalAfterDiscount } });
    } catch (err) {
      res.status(400).json({ error: err.message || 'Invalid coupon' });
    }
  }

  static async getAllCoupons(req, res) {
    try {
      const coupons = await Coupon.getAll();
      res.json({ success: true, data: coupons });
    } catch (err) {
      console.error('[CouponController.getAllCoupons] Error:', err);
      res.status(500).json({ success: false, error: 'Failed to fetch coupons' });
    }
  }

  static async createCoupon(req, res) {
    try {
      const { code, type, value, min_order_total, uses_left, valid_from, valid_to, active } = req.body;

      if (!code || !type) {
        return res.status(400).json({ success: false, error: 'Code and type are required' });
      }

      const couponData = {
        code: code.toUpperCase(),
        type,
        value: type === 'free_shipping' ? 0 : this.parseDecimal(value),
        min_order_total: this.parseDecimal(min_order_total),
        uses_left: this.parseInteger(uses_left),
        valid_from: valid_from || null,
        valid_to: valid_to || null,
        active: active !== undefined ? active : true
      };

      const couponId = await Coupon.create(couponData);
      res.json({ success: true, data: { id: couponId, ...couponData } });
    } catch (err) {
      console.error('[CouponController.createCoupon] Error:', err);
      if (err.code === 'ER_DUP_ENTRY') {
        res.status(400).json({ success: false, error: 'Coupon code already exists' });
      } else {
        res.status(500).json({ success: false, error: 'Failed to create coupon' });
      }
    }
  }

  static async updateCoupon(req, res) {
    try {
      const { id } = req.params;
      const { code, type, value, min_order_total, uses_left, valid_from, valid_to, active } = req.body;

      if (!id) {
        return res.status(400).json({ success: false, error: 'Coupon ID is required' });
      }

      const couponData = {
        code: code ? code.toUpperCase() : undefined,
        type,
        value: type === 'free_shipping' ? 0 : (value !== undefined ? this.parseDecimal(value) : undefined),
        min_order_total: min_order_total !== undefined ? this.parseDecimal(min_order_total) : undefined,
        uses_left: uses_left !== undefined ? this.parseInteger(uses_left) : undefined,
        valid_from: valid_from || null,
        valid_to: valid_to || null,
        active: active !== undefined ? active : undefined
      };

      // Remove undefined values
      Object.keys(couponData).forEach(key => couponData[key] === undefined && delete couponData[key]);

      const updated = await Coupon.update(id, couponData);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Coupon not found' });
      }

      res.json({ success: true, data: updated });
    } catch (err) {
      console.error('[CouponController.updateCoupon] Error:', err);
      if (err.code === 'ER_DUP_ENTRY') {
        res.status(400).json({ success: false, error: 'Coupon code already exists' });
      } else {
        res.status(500).json({ success: false, error: 'Failed to update coupon' });
      }
    }
  }

  static async getCouponById(req, res) {
    try {
      const { id } = req.params;
      const coupon = await Coupon.getById(id);
      if (!coupon) {
        return res.status(404).json({ success: false, error: 'Coupon not found' });
      }
      res.json({ success: true, data: coupon });
    } catch (err) {
      console.error('[CouponController.getCouponById] Error:', err);
      res.status(500).json({ success: false, error: 'Failed to fetch coupon' });
    }
  }

  static async deleteCoupon(req, res) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ success: false, error: 'Coupon ID is required' });
      }

      const deleted = await Coupon.delete(id);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Coupon not found' });
      }

      res.json({ success: true, message: 'Coupon deleted successfully' });
    } catch (err) {
      console.error('[CouponController.deleteCoupon] Error:', err);
      res.status(500).json({ success: false, error: 'Failed to delete coupon' });
    }
  }
}

module.exports = CouponController;
