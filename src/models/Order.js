const { pool } = require('../config/database');

class Order {
  static async create({ buyerId, address, notes, items, total }) {
    try {
      // Insert order
      const sql = `INSERT INTO orders (buyer_id, address, notes, total, created_at) VALUES (?, ?, ?, ?, NOW())`;
      console.log('[Order.create] SQL:', sql, [buyerId, address, notes, total]);
      const result = await pool.query(sql, [buyerId, address, notes, total]);
      const orderId = result[0].insertId;
      // Insert order items
      for (const item of items) {
        await pool.query(
          `INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)`,
          [orderId, item.product_id, item.quantity, item.price]
        );
      }
      return { id: orderId, buyerId, address, notes, total, items };
    } catch (err) {
      console.error('[Order.create] Error:', err);
      throw err;
    }
  }

  static async getByBuyerId(buyerId) {
    try {
      const sql = `SELECT * FROM orders WHERE buyer_id = ? ORDER BY created_at DESC`;
      const [orders] = await pool.query(sql, [buyerId]);
      for (const order of orders) {
        const [items] = await pool.query(
          `SELECT oi.*, p.name_en, p.image FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?`,
          [order.id]
        );
        order.items = items;
      }
      return orders;
    } catch (err) {
      console.error('[Order.getByBuyerId] Error:', err);
      throw err;
    }
  }
}

module.exports = Order;
