const { pool } = require('../config/database');

class Checkout {
  static async create({ orderId, buyerId, total, currency = 'EUR', status = 'pending', checkoutUrl = null, paymentMethod = null }, connection = null) {
    try {
      const sql = `INSERT INTO checkouts (order_id, buyer_id, total, currency, status, checkout_url, payment_method, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`;
      const queryTarget = connection || pool;
      const [result] = await queryTarget.query(sql, [orderId, buyerId, total, currency, status, checkoutUrl, paymentMethod]);
      return {
        id: result.insertId,
        orderId,
        buyerId,
        total,
        currency,
        status,
        checkoutUrl,
        paymentMethod,
        created_at: new Date(),
        updated_at: new Date()
      };
    } catch (err) {
      console.error('[Checkout.create] Error:', err);
      throw err;
    }
  }

  static async getById(id) {
    try {
      const [rows] = await pool.query('SELECT * FROM checkouts WHERE id = ?', [id]);
      return rows[0] || null;
    } catch (err) {
      console.error('[Checkout.getById] Error:', err);
      throw err;
    }
  }

  static async getByBuyerId(buyerId) {
    try {
      const [rows] = await pool.query('SELECT * FROM checkouts WHERE buyer_id = ? ORDER BY created_at DESC', [buyerId]);
      return rows;
    } catch (err) {
      console.error('[Checkout.getByBuyerId] Error:', err);
      throw err;
    }
  }

  static async updateStatus(id, status) {
    try {
      await pool.query('UPDATE checkouts SET status = ?, updated_at = NOW() WHERE id = ?', [status, id]);
      return this.getById(id);
    } catch (err) {
      console.error('[Checkout.updateStatus] Error:', err);
      throw err;
    }
  }

  static async updateCheckoutUrl(id, checkoutUrl) {
    try {
      await pool.query('UPDATE checkouts SET checkout_url = ?, updated_at = NOW() WHERE id = ?', [checkoutUrl, id]);
      return this.getById(id);
    } catch (err) {
      console.error('[Checkout.updateCheckoutUrl] Error:', err);
      throw err;
    }
  }
}

module.exports = Checkout;
