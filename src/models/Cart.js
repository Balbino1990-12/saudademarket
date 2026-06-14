const { pool } = require('../config/database');

class Cart {
  /**
   * Get all cart items for a user with product information
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of cart items with product details
   */
  static async getByUserId(userId) {
    try {
      const sql = `
        SELECT c.id, c.user_id, c.product_id, c.quantity, c.created_at, c.updated_at,
               p.name_en, p.name_fr, p.name_pt, p.price, p.promo_price, p.image, p.description,
               cat.name_en as category_name
        FROM cart c
        LEFT JOIN products p ON c.product_id = p.id
        LEFT JOIN categories cat ON p.category_id = cat.id
        WHERE c.user_id = ?
        ORDER BY c.created_at DESC
      `;
      const [rows] = await pool.query(sql, [userId]);
      console.log('[Cart.getByUserId] Retrieved', rows.length, 'cart items for user', userId);
      return rows;
    } catch (err) {
      console.error('[Cart.getByUserId] Error:', err);
      throw err;
    }
  }

  /**
   * Add item to cart or update quantity if already exists
   * @param {string} userId - User ID
   * @param {string} productId - Product ID
   * @param {number} quantity - Quantity to add (default: 1)
   * @returns {Promise<Object>} Cart item object
   */
  static async addItem(userId, productId, quantity = 1) {
    try {
      // First check if item already exists in cart
      const [existing] = await pool.query(
        'SELECT id, quantity FROM cart WHERE user_id = ? AND product_id = ?',
        [userId, productId]
      );

      if (existing.length > 0) {
        // Update existing item
        const newQuantity = existing[0].quantity + quantity;
        await pool.query(
          'UPDATE cart SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [newQuantity, existing[0].id]
        );
        console.log('[Cart.addItem] Updated quantity for product', productId, 'to', newQuantity);
      } else {
        // Insert new item
        await pool.query(
          'INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)',
          [userId, productId, quantity]
        );
        console.log('[Cart.addItem] Added new item to cart:', productId, 'quantity:', quantity);
      }

      // Return the updated cart item
      const [result] = await pool.query(
        `SELECT c.*, p.name_en, p.name_fr, p.name_pt, p.price, p.promo_price, p.image
         FROM cart c
         LEFT JOIN products p ON c.product_id = p.id
         WHERE c.user_id = ? AND c.product_id = ?`,
        [userId, productId]
      );
      return result[0];
    } catch (err) {
      console.error('[Cart.addItem] Error:', err);
      throw err;
    }
  }

  /**
   * Update quantity of cart item
   * @param {string} userId - User ID
   * @param {string} productId - Product ID
   * @param {number} quantity - New quantity
   * @returns {Promise<Object>} Updated cart item
   */
  static async updateQuantity(userId, productId, quantity) {
    try {
      if (quantity <= 0) {
        // Remove item if quantity is 0 or negative
        await this.removeItem(userId, productId);
        return null;
      }

      await pool.query(
        'UPDATE cart SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND product_id = ?',
        [quantity, userId, productId]
      );

      // Return updated item
      const [result] = await pool.query(
        `SELECT c.*, p.name_en, p.name_fr, p.name_pt, p.price, p.promo_price, p.image
         FROM cart c
         LEFT JOIN products p ON c.product_id = p.id
         WHERE c.user_id = ? AND c.product_id = ?`,
        [userId, productId]
      );

      console.log('[Cart.updateQuantity] Updated quantity for product', productId, 'to', quantity);
      return result[0] || null;
    } catch (err) {
      console.error('[Cart.updateQuantity] Error:', err);
      throw err;
    }
  }

  /**
   * Remove item from cart
   * @param {string} userId - User ID
   * @param {string} productId - Product ID
   * @returns {Promise<boolean>} True if item was removed
   */
  static async removeItem(userId, productId) {
    try {
      const [result] = await pool.query(
        'DELETE FROM cart WHERE user_id = ? AND product_id = ?',
        [userId, productId]
      );
      const removed = result.affectedRows > 0;
      console.log('[Cart.removeItem] Removed item:', productId, 'from user', userId, '- success:', removed);
      return removed;
    } catch (err) {
      console.error('[Cart.removeItem] Error:', err);
      throw err;
    }
  }

  /**
   * Clear entire cart for user
   * @param {string} userId - User ID
   * @returns {Promise<number>} Number of items removed
   */
  static async clearCart(userId, connection = null) {
    try {
      const queryTarget = connection || pool;
      const [result] = await queryTarget.query('DELETE FROM cart WHERE user_id = ?', [userId]);
      console.log('[Cart.clearCart] Cleared cart for user', userId, '-', result.affectedRows, 'items removed');
      return result.affectedRows;
    } catch (err) {
      console.error('[Cart.clearCart] Error:', err);
      throw err;
    }
  }

  /**
   * Get cart total for user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Object with itemCount and totalPrice
   */
  static async getCartSummary(userId) {
    try {
      const sql = `
        SELECT COUNT(*) as itemCount,
               SUM(c.quantity * CASE
                 WHEN p.promo_price IS NOT NULL AND p.promo_price > 0 AND p.promo_price < p.price THEN p.promo_price
                 ELSE p.price
               END) as totalPrice
        FROM cart c
        LEFT JOIN products p ON c.product_id = p.id
        WHERE c.user_id = ?
      `;
      const [result] = await pool.query(sql, [userId]);
      const summary = result[0];
      summary.totalPrice = parseFloat(summary.totalPrice || 0);
      console.log('[Cart.getCartSummary] Cart summary for user', userId, ':', summary);
      return summary;
    } catch (err) {
      console.error('[Cart.getCartSummary] Error:', err);
      throw err;
    }
  }

  /**
   * Check if product exists in user's cart
   * @param {string} userId - User ID
   * @param {string} productId - Product ID
   * @returns {Promise<boolean>} True if product is in cart
   */
  static async hasItem(userId, productId) {
    try {
      const [result] = await pool.query(
        'SELECT COUNT(*) as count FROM cart WHERE user_id = ? AND product_id = ?',
        [userId, productId]
      );
      return result[0].count > 0;
    } catch (err) {
      console.error('[Cart.hasItem] Error:', err);
      throw err;
    }
  }
}

module.exports = Cart;
