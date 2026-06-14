const { pool } = require('../config/database');

class Return {
  /**
   * Create a new return request
   * @param {Object} returnData - Return data
   * @returns {Promise<Object>} Created return
   */
  static async create(returnData) {
    try {
      const rmaNumber = `RMA${Date.now()}${Math.floor(Math.random() * 100000)}`;
      const sql = `INSERT INTO returns (rma_number, order_id, buyer_id, product_id, quantity, reason, condition_description, status, refund_amount, refund_method, admin_notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      const [result] = await pool.query(sql, [
        rmaNumber,
        returnData.order_id,
        returnData.buyer_id,
        returnData.product_id,
        returnData.quantity || 1,
        returnData.reason,
        returnData.condition_description || null,
        returnData.status || 'pending',
        returnData.refund_amount || 0,
        returnData.refund_method || null,
        returnData.admin_notes || null
      ]);
      const returnId = result.insertId;
      console.log('[Return.create] ✅ Return created:', rmaNumber);
      return await this.getById(returnId);
    } catch (err) {
      console.error('[Return.create] Error:', err);
      throw err;
    }
  }

  /**
   * Get return by ID with order and product details
   * @param {number} id - Return ID
   * @returns {Promise<Object|null>} Return object or null
   */
  static async getById(id) {
    try {
      const sql = `
        SELECT r.*,
               o.order_serial, o.total as order_total, o.created_at as order_date,
               p.name_en, p.name_fr, p.name_pt, p.price as product_price,
               u.username as buyer_username, u.email as buyer_email
        FROM returns r
        LEFT JOIN orders o ON r.order_id = o.id
        LEFT JOIN products p ON r.product_id = p.id
        LEFT JOIN users u ON r.buyer_id = u.id
        WHERE r.id = ?
      `;
      const [rows] = await pool.query(sql, [id]);
      return rows.length > 0 ? rows[0] : null;
    } catch (err) {
      console.error('[Return.getById] Error:', err);
      throw err;
    }
  }

  /**
   * Get returns by buyer ID
   * @param {number} buyerId - Buyer ID
   * @returns {Promise<Array>} Array of returns
   */
  static async getByBuyerId(buyerId) {
    try {
      const sql = `
        SELECT r.*,
               o.order_serial, o.total as order_total, o.created_at as order_date,
               p.name_en, p.name_fr, p.name_pt, p.price as product_price
        FROM returns r
        LEFT JOIN orders o ON r.order_id = o.id
        LEFT JOIN products p ON r.product_id = p.id
        WHERE r.buyer_id = ?
        ORDER BY r.created_at DESC
      `;
      const [rows] = await pool.query(sql, [buyerId]);
      return rows;
    } catch (err) {
      console.error('[Return.getByBuyerId] Error:', err);
      throw err;
    }
  }

  /**
   * Get all returns (for admin)
   * @returns {Promise<Array>} Array of all returns
   */
  static async getAll() {
    try {
      const sql = `
        SELECT r.*,
               o.order_serial, o.total as order_total, o.created_at as order_date,
               p.name_en, p.name_fr, p.name_pt, p.price as product_price,
               u.username as buyer_username, u.email as buyer_email
        FROM returns r
        LEFT JOIN orders o ON r.order_id = o.id
        LEFT JOIN products p ON r.product_id = p.id
        LEFT JOIN users u ON r.buyer_id = u.id
        ORDER BY r.created_at DESC
      `;
      const [rows] = await pool.query(sql, []);
      return rows;
    } catch (err) {
      console.error('[Return.getAll] Error:', err);
      throw err;
    }
  }

  /**
   * Update return status and details
   * @param {number} id - Return ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated return
   */
  static async update(id, updateData) {
    try {
      const sql = `UPDATE returns SET status = ?, refund_amount = ?, refund_method = ?, admin_notes = ?, updated_at = NOW() WHERE id = ?`;
      await pool.query(sql, [
        updateData.status,
        updateData.refund_amount || 0,
        updateData.refund_method || null,
        updateData.admin_notes || null,
        id
      ]);
      console.log('[Return.update] ✅ Return updated:', id);
      return await this.getById(id);
    } catch (err) {
      console.error('[Return.update] Error:', err);
      throw err;
    }
  }

  /**
   * Check if buyer can return this product from this order
   * @param {number} orderId - Order ID
   * @param {number} productId - Product ID
   * @param {number} buyerId - Buyer ID
   * @returns {Promise<boolean>} True if return is allowed
   */
  static async canReturn(orderId, productId, buyerId, quantity = 1) {
    try {
      // Check if order exists and belongs to buyer
      const orderSql = `SELECT id, created_at FROM orders WHERE id = ? AND buyer_id = ?`;
      const [orderRows] = await pool.query(orderSql, [orderId, buyerId]);
      if (orderRows.length === 0) return false;

      const orderDate = new Date(orderRows[0].created_at);
      const now = new Date();
      const daysSinceOrder = (now - orderDate) / (1000 * 60 * 60 * 24);

      // Return policy: 14 days
      if (daysSinceOrder > 14) return false;

      // Check if product was in the order
      const itemSql = `SELECT quantity FROM order_items WHERE order_id = ? AND product_id = ?`;
      const [itemRows] = await pool.query(itemSql, [orderId, productId]);
      if (itemRows.length === 0) return false;

      const orderedQty = itemRows[0].quantity || 0;
      if (quantity <= 0 || quantity > orderedQty) return false;

      // Check how much has already been returned (pending/approved/received/refunded/exchanged)
      const returnedSql = `SELECT COALESCE(SUM(quantity), 0) AS returnedQty FROM returns WHERE order_id = ? AND product_id = ? AND buyer_id = ? AND status IN ('pending','approved','received','refunded','exchanged')`;
      const [returnedRows] = await pool.query(returnedSql, [orderId, productId, buyerId]);
      const alreadyReturned = returnedRows[0]?.returnedQty || 0;

      if (alreadyReturned + quantity > orderedQty) return false;

      return true;
    } catch (err) {
      console.error('[Return.canReturn] Error:', err);
      return false;
    }
  }
}

module.exports = Return;