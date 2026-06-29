const Coupon = require('../models/Coupon');

class CouponController {
  static formatErrorMessage(err, fallbackMessage) {
    if (!err) return fallbackMessage;
    return err.message || err.sqlMessage || fallbackMessage;
  }

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

  static normalizeDateTime(value) {
    if (value === undefined || value === null || value === '') return null;
    const rawValue = String(value).trim();
    if (!rawValue) return null;

    const parsed = new Date(rawValue);
    if (Number.isNaN(parsed.getTime())) {
      return rawValue;
    }

    const pad = (num) => String(num).padStart(2, '0');
    return [
      parsed.getFullYear(),
      pad(parsed.getMonth() + 1),
      pad(parsed.getDate())
    ].join('-') + ' ' + [
      pad(parsed.getHours()),
      pad(parsed.getMinutes()),
      pad(parsed.getSeconds())
    ].join(':');
  }

  static normalizeBoolean(value, fallback = true) {
    if (value === undefined || value === null) return fallback;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on') return true;
      if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'off') return false;
    }
    return fallback;
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

      const normalizedType = String(type).trim();
      const parsedValue = CouponController.parseDecimal(value);
      const parsedMinOrderTotal = CouponController.parseDecimal(min_order_total);

      const couponData = {
        code: code.toUpperCase(),
        type: normalizedType,
        value: normalizedType === 'free_shipping' ? 0 : (parsedValue ?? 0),
        min_order_total: parsedMinOrderTotal ?? 0,
        uses_left: CouponController.parseInteger(uses_left),
        valid_from: CouponController.normalizeDateTime(valid_from),
        valid_to: CouponController.normalizeDateTime(valid_to),
        active: CouponController.normalizeBoolean(active, true)
      };

      const couponId = await Coupon.create(couponData);
      res.json({ success: true, data: { id: couponId, ...couponData } });
    } catch (err) {
      console.error('[CouponController.createCoupon] Error:', err);
      if (err.code === 'ER_DUP_ENTRY') {
        res.status(400).json({ success: false, error: 'Coupon code already exists' });
      } else {
        res.status(500).json({
          success: false,
          error: CouponController.formatErrorMessage(err, 'Failed to create coupon')
        });
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

      const couponType = type !== undefined ? String(type).trim() : undefined;
      const parsedValue = CouponController.parseDecimal(value);
      const parsedMinOrderTotal = CouponController.parseDecimal(min_order_total);

      const couponData = {
        code: code ? code.toUpperCase() : undefined,
        type: couponType,
        value: couponType === 'free_shipping' ? 0 : (value !== undefined ? (parsedValue ?? 0) : undefined),
        min_order_total: min_order_total !== undefined ? (parsedMinOrderTotal ?? 0) : undefined,
        uses_left: uses_left !== undefined ? CouponController.parseInteger(uses_left) : undefined,
        valid_from: valid_from !== undefined ? CouponController.normalizeDateTime(valid_from) : undefined,
        valid_to: valid_to !== undefined ? CouponController.normalizeDateTime(valid_to) : undefined,
        active: active !== undefined ? CouponController.normalizeBoolean(active, undefined) : undefined
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
        res.status(500).json({
          success: false,
          error: CouponController.formatErrorMessage(err, 'Failed to update coupon')
        });
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
