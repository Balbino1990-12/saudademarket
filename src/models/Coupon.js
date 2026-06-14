const { pool } = require('../config/database');

class Coupon {
  static async getByCode(code) {
    try {
      if (!code || typeof code !== 'string') return null;
      const normalizedCode = code.trim().toUpperCase();
      const [rows] = await pool.query('SELECT * FROM coupons WHERE UPPER(code) = ? AND active = 1 LIMIT 1', [normalizedCode]);
      return rows[0] || null;
    } catch (err) {
      console.error('[Coupon.getByCode] Error:', err);
      throw err;
    }
  }

  static async apply(code, orderTotal, shippingCost = 0) {
    if (!code || typeof code !== 'string') {
      throw new Error('Coupon code is required');
    }
    const coupon = await this.getByCode(code);
    if (!coupon) {
      throw new Error('Coupon not found or inactive');
    }

    const now = new Date();
    if (coupon.valid_from && now < new Date(coupon.valid_from)) {
      throw new Error('Coupon is not yet valid');
    }
    if (coupon.valid_to && now > new Date(coupon.valid_to)) {
      throw new Error('Coupon has expired');
    }

    if (coupon.uses_left !== null && coupon.uses_left <= 0) {
      throw new Error('Coupon usage limit reached');
    }

    const minTotal = Number(coupon.min_order_total || 0);
    if (orderTotal < minTotal) {
      throw new Error(`Coupon requires minimum order total of €${minTotal.toFixed(2)}`);
    }

    let discount = 0;
    let freeShipping = false;
    if (coupon.type === 'percent') {
      discount = Number(((orderTotal * Number(coupon.value)) / 100).toFixed(2));
    } else if (coupon.type === 'fixed') {
      discount = Number(Number(coupon.value).toFixed(2));
    } else if (coupon.type === 'free_shipping') {
      freeShipping = true;
      discount = shippingCost; // Assume shipping cost is passed
    }

    if (discount > orderTotal && coupon.type !== 'free_shipping') {
      discount = orderTotal;
    }

    return {
      coupon,
      discount,
      freeShipping,
      totalAfterDiscount: Number((orderTotal + shippingCost - discount).toFixed(2)),
      usesLeft: coupon.uses_left
    };
  }

  static async decrementUses(id, connection = null) {
    try {
      const conn = connection || pool;
      await conn.query('UPDATE coupons SET uses_left = uses_left - 1 WHERE id = ? AND uses_left IS NOT NULL AND uses_left > 0', [id]);
      return await this.getById(id);
    } catch (err) {
      console.error('[Coupon.decrementUses] Error:', err);
      throw err;
    }
  }

  static async getById(id) {
    try {
      const sql = `
        SELECT c.*, COALESCE(u.user_count, 0) AS used_by
        FROM coupons c
        LEFT JOIN (
          SELECT UPPER(coupon_code) AS coupon_code, COUNT(DISTINCT buyer_id) AS user_count
          FROM orders
          WHERE coupon_code IS NOT NULL
          GROUP BY UPPER(coupon_code)
        ) u ON u.coupon_code = UPPER(c.code)
        WHERE c.id = ?
      `;
      const [rows] = await pool.query(sql, [id]);
      return rows[0] || null;
    } catch (err) {
      console.error('[Coupon.getById] Error:', err);
      throw err;
    }
  }

  static async getAll() {
    try {
      const sql = `
        SELECT c.*, COALESCE(u.user_count, 0) AS used_by
        FROM coupons c
        LEFT JOIN (
          SELECT UPPER(coupon_code) AS coupon_code, COUNT(DISTINCT buyer_id) AS user_count
          FROM orders
          WHERE coupon_code IS NOT NULL
          GROUP BY UPPER(coupon_code)
        ) u ON u.coupon_code = UPPER(c.code)
        ORDER BY c.created_at DESC
      `;
      const [rows] = await pool.query(sql);
      return rows;
    } catch (err) {
      console.error('[Coupon.getAll] Error:', err);
      throw err;
    }
  }

  static async create(couponData) {
    try {
      const { code, type, value, min_order_total, uses_left, valid_from, valid_to, active } = couponData;
      const [result] = await pool.query(
        'INSERT INTO coupons (code, type, value, min_order_total, uses_left, valid_from, valid_to, active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())',
        [code, type, value, min_order_total, uses_left, valid_from, valid_to, active]
      );
      return result.insertId;
    } catch (err) {
      console.error('[Coupon.create] Error:', err);
      throw err;
    }
  }

  static async update(id, couponData) {
    try {
      const fields = [];
      const values = [];

      Object.keys(couponData).forEach(key => {
        if (couponData[key] !== undefined) {
          fields.push(`${key} = ?`);
          values.push(couponData[key]);
        }
      });

      if (fields.length === 0) {
        return null;
      }

      values.push(id);
      const [result] = await pool.query(`UPDATE coupons SET ${fields.join(', ')} WHERE id = ?`, values);

      if (result.affectedRows === 0) {
        return null;
      }

      return await this.getById(id);
    } catch (err) {
      console.error('[Coupon.update] Error:', err);
      throw err;
    }
  }

  static async delete(id) {
    try {
      const [result] = await pool.query('DELETE FROM coupons WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } catch (err) {
      console.error('[Coupon.delete] Error:', err);
      throw err;
    }
  }
}

module.exports = Coupon;
