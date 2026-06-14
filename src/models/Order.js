const { pool } = require('../config/database');

class Order {
  static async create({ buyerId, address, notes, items, total, couponCode = null, discountAmount = 0, shippingCost = 0, shippingMethod = 'Standard', shippingStatus = 'pending', trackingNumber = null, referralCode = null }, connection = null) {
    try {
      const itemsJson = JSON.stringify(items);
      const orderSerial = `ORD${Date.now()}${Math.floor(Math.random() * 100000)}`;
      const sql = `INSERT INTO orders (order_serial, buyer_id, coupon_code, referral_code, discount_amount, shipping_cost, shipping_method, shipping_status, tracking_number, address, notes, items, total, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`;
      console.log('[Order.create] SQL:', sql, [orderSerial, buyerId, couponCode, referralCode, discountAmount, shippingCost, shippingMethod, shippingStatus, trackingNumber, address, notes, itemsJson, total]);
      const queryTarget = connection || pool;
      const [result] = await queryTarget.query(sql, [orderSerial, buyerId, couponCode, referralCode, discountAmount, shippingCost, shippingMethod, shippingStatus, trackingNumber, address, notes, itemsJson, total]);
      const orderId = result.insertId;

      // Keep compatibility for older schemas in case order_serial column was added late
      // (the insert above may fail if column does not exist in legacy DB)
      if (!orderId) {
        throw new Error('Order insert failed');
      }

      for (const item of items) {
        await queryTarget.query(
          `INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)`,
          [orderId, item.product_id, item.quantity, item.price]
        );
      }

      return {
        id: orderId,
        order_serial: orderSerial,
        buyerId,
        address,
        notes,
        shipping_cost: shippingCost,
        shipping_method: shippingMethod,
        shipping_status: shippingStatus,
        tracking_number: trackingNumber,
        total,
        coupon_code: couponCode,
        referral_code: referralCode,
        discount_amount: discountAmount,
        items
      };
    } catch (err) {
      console.error('[Order.create] Error:', err);
      throw err;
    }
  }

  static async getByBuyerId(buyerId) {
    try {
      const sql = `
        SELECT o.*, c.status AS payment_status, c.payment_method
        FROM orders o
        LEFT JOIN checkouts c ON c.order_id = o.id
        WHERE o.buyer_id = ?
        ORDER BY o.created_at DESC
      `;
      const [orders] = await pool.query(sql, [buyerId]);
      for (const order of orders) {
        order.payment_status = order.payment_status || 'unknown';
        order.payment_method = order.payment_method || 'unknown';
        // Provide deserialized JSON items for API consumers
        try {
          order.items = order.items ? JSON.parse(order.items) : [];
        } catch (parseErr) {
          order.items = [];
        }

        const [lineItems] = await pool.query(
          `SELECT oi.*, p.name_en, p.image FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?`,
          [order.id]
        );
        order.lineItems = lineItems;
      }
      return orders;
    } catch (err) {
      console.error('[Order.getByBuyerId] Error:', err);
      throw err;
    }
  }

  static async getBySerial(orderSerial) {
    try {
      const sql = `
        SELECT o.*, u.username, u.first_name, u.last_name, c.status AS payment_status, c.payment_method
        FROM orders o
        LEFT JOIN users u ON u.id = o.buyer_id
        LEFT JOIN checkouts c ON c.order_id = o.id
        WHERE o.order_serial = ?
        LIMIT 1
      `;
      const [orders] = await pool.query(sql, [orderSerial]);
      if (!orders.length) return null;

      const order = orders[0];
      order.payment_status = order.payment_status || 'unknown';
      order.payment_method = order.payment_method || 'unknown';

      try {
        order.items = order.items ? JSON.parse(order.items) : [];
      } catch (parseErr) {
        order.items = [];
      }

      const [lineItems] = await pool.query(
        `SELECT oi.*, p.name_en, p.image FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?`,
        [order.id]
      );
      order.lineItems = lineItems;
      return order;
    } catch (err) {
      console.error('[Order.getBySerial] Error:', err);
      throw err;
    }
  }

  static async getAllOrders() {
    try {
      const sql = `
        SELECT o.*, u.username, u.email, u.first_name, u.last_name, c.status AS payment_status, c.payment_method
        FROM orders o
        LEFT JOIN users u ON u.id = o.buyer_id
        LEFT JOIN checkouts c ON c.order_id = o.id
        ORDER BY o.created_at DESC
      `;
      const [orders] = await pool.query(sql);
      for (const order of orders) {
        order.payment_status = order.payment_status || 'unknown';
        order.payment_method = order.payment_method || 'unknown';
        try {
          order.items = order.items ? JSON.parse(order.items) : [];
        } catch (parseErr) {
          order.items = [];
        }
        const [lineItems] = await pool.query(
          `SELECT oi.*, p.name_en, p.image FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?`,
          [order.id]
        );
        order.lineItems = lineItems;
      }
      return orders;
    } catch (err) {
      console.error('[Order.getAllOrders] Error:', err);
      throw err;
    }
  }

  static async count() {
    try {
      const sql = 'SELECT COUNT(*) as count FROM orders';
      const [result] = await pool.query(sql);
      const count = result[0]?.count || 0;
      console.log('[Order.count] Total orders:', count);
      return count;
    } catch (err) {
      console.error('[Order.count] Error:', err);
      throw err;
    }
  }

  static async getTotalSales() {
    try {
      const sql = 'SELECT SUM(total) as totalSales FROM orders';
      const [result] = await pool.query(sql);
      const totalSales = result[0]?.totalSales || 0;
      console.log('[Order.getTotalSales] Total sales:', totalSales);
      return parseFloat(totalSales) || 0;
    } catch (err) {
      console.error('[Order.getTotalSales] Error:', err);
      throw err;
    }
  }

  static async getTotalOrderItemsCount() {
    try {
      const sql = 'SELECT COALESCE(SUM(quantity), 0) as totalConnections FROM order_items';
      const [result] = await pool.query(sql);
      const totalConnections = result[0]?.totalConnections || 0;
      console.log('[Order.getTotalOrderItemsCount] Total order items:', totalConnections);
      return parseInt(totalConnections, 10) || 0;
    } catch (err) {
      console.error('[Order.getTotalOrderItemsCount] Error:', err);
      throw err;
    }
  }

  static async getAverageOrderDurationMinutes() {
    try {
      const sql = `
        SELECT AVG(TIMESTAMPDIFF(MINUTE, created_at, updated_at)) as averageTime
        FROM orders
        WHERE updated_at IS NOT NULL
          AND updated_at != created_at
      `;
      const [result] = await pool.query(sql);
      const averageTime = result[0]?.averageTime || 0;
      console.log('[Order.getAverageOrderDurationMinutes] Average order duration (minutes):', averageTime);
      return parseFloat(averageTime) || 0;
    } catch (err) {
      console.error('[Order.getAverageOrderDurationMinutes] Error:', err);
      throw err;
    }
  }

  static async getOrdersByShippingStatus() {
    try {
      const sql = `
        SELECT shipping_status, COUNT(*) as count 
        FROM orders 
        GROUP BY shipping_status
        ORDER BY count DESC
      `;
      const [result] = await pool.query(sql);
      console.log('[Order.getOrdersByShippingStatus] Status breakdown:', result);
      return result;
    } catch (err) {
      console.error('[Order.getOrdersByShippingStatus] Error:', err);
      throw err;
    }
  }

  static async getOrdersByPaymentStatus() {
    try {
      const sql = `
        SELECT c.status as payment_status, COUNT(*) as count 
        FROM orders o
        LEFT JOIN checkouts c ON c.order_id = o.id
        GROUP BY c.status
        ORDER BY count DESC
      `;
      const [result] = await pool.query(sql);
      console.log('[Order.getOrdersByPaymentStatus] Payment status breakdown:', result);
      return result;
    } catch (err) {
      console.error('[Order.getOrdersByPaymentStatus] Error:', err);
      throw err;
    }
  }

  static async getOrdersTrendLast7Days() {
    try {
      const sql = `
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM orders
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `;
      const [result] = await pool.query(sql);
      console.log('[Order.getOrdersTrendLast7Days] Trend data:', result);
      return result;
    } catch (err) {
      console.error('[Order.getOrdersTrendLast7Days] Error:', err);
      throw err;
    }
  }

  static buildReportFilters(filters = {}) {
    const conditions = [];
    const params = [];

    if (filters.startDate) {
      conditions.push('o.created_at >= ?');
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      conditions.push('o.created_at <= ?');
      params.push(filters.endDate);
    }
    if (filters.status) {
      conditions.push('o.status = ?');
      params.push(filters.status);
    }
    if (filters.paymentStatus) {
      conditions.push('c.status = ?');
      params.push(filters.paymentStatus);
    }
    if (filters.categoryId) {
      conditions.push(`EXISTS (SELECT 1 FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = o.id AND p.category_id = ?)`);
      params.push(filters.categoryId);
    }
    if (filters.sellerId) {
      conditions.push(`EXISTS (SELECT 1 FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = o.id AND p.user_id = ?)`);
      params.push(filters.sellerId);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    return { where, params };
  }

  static async getReport(filters = {}) {
    try {
      const { where, params } = this.buildReportFilters(filters);
      let sql = `
        SELECT o.id, o.order_serial, o.buyer_id, u.username, u.email, o.status, o.shipping_status, o.total, o.coupon_code,
               c.status AS payment_status, c.payment_method, o.created_at, o.updated_at,
               COALESCE((SELECT SUM(quantity) FROM order_items WHERE order_id = o.id), 0) AS item_count
        FROM orders o
        LEFT JOIN users u ON u.id = o.buyer_id
        LEFT JOIN checkouts c ON c.order_id = o.id
        ${where}
        ORDER BY o.created_at DESC
      `;
      const queryParams = [...params];
      if (Number.isInteger(filters.limit) && filters.limit > 0) {
        sql += ' LIMIT ?';
        queryParams.push(filters.limit);
      }
      if (Number.isInteger(filters.offset) && filters.offset >= 0) {
        sql += ' OFFSET ?';
        queryParams.push(filters.offset);
      }
      const [rows] = await pool.query(sql, queryParams);
      return rows.map(row => ({
        ...row,
        total: parseFloat(row.total || 0),
        item_count: Number(row.item_count)
      }));
    } catch (err) {
      console.error('[Order.getReport] Error:', err);
      throw err;
    }
  }

  static async getRevenueByProduct(filters = {}) {
    try {
      const { where, params } = this.buildReportFilters(filters);
      const sql = `
        SELECT p.id as product_id, p.name_en as product_name, p.name_fr as product_name_fr, p.name_pt as product_name_pt,
               SUM(oi.price * oi.quantity) as revenue, SUM(oi.quantity) as quantity_sold
        FROM orders o
        JOIN order_items oi ON oi.order_id = o.id
        JOIN products p ON p.id = oi.product_id
        LEFT JOIN checkouts c ON c.order_id = o.id
        ${where}
        GROUP BY p.id
        ORDER BY revenue DESC
        LIMIT 50
      `;
      const [rows] = await pool.query(sql, params);
      return rows;
    } catch (err) {
      console.error('[Order.getRevenueByProduct] Error:', err);
      throw err;
    }
  }

  static async getRevenueByCategory(filters = {}) {
    try {
      const { where, params } = this.buildReportFilters(filters);
      const sql = `
        SELECT cat.id as category_id, cat.name_en as category_name, SUM(oi.price * oi.quantity) as revenue, SUM(oi.quantity) as quantity_sold
        FROM orders o
        JOIN order_items oi ON oi.order_id = o.id
        JOIN products p ON p.id = oi.product_id
        JOIN categories cat ON cat.id = p.category_id
        LEFT JOIN checkouts c ON c.order_id = o.id
        ${where}
        GROUP BY cat.id
        ORDER BY revenue DESC
        LIMIT 50
      `;
      const [rows] = await pool.query(sql, params);
      return rows;
    } catch (err) {
      console.error('[Order.getRevenueByCategory] Error:', err);
      throw err;
    }
  }

  static async getRevenueTrend(filters = {}) {
    try {
      const { where, params } = this.buildReportFilters(filters);
      const sql = `
        SELECT DATE(o.created_at) as period, SUM(o.total) as revenue, COUNT(*) as orders
        FROM orders o
        LEFT JOIN checkouts c ON c.order_id = o.id
        ${where}
        GROUP BY DATE(o.created_at)
        ORDER BY DATE(o.created_at) ASC
      `;
      const [rows] = await pool.query(sql, params);
      return rows.map(row => ({
        period: row.period,
        revenue: parseFloat(row.revenue || 0),
        orders: Number(row.orders)
      }));
    } catch (err) {
      console.error('[Order.getRevenueTrend] Error:', err);
      throw err;
    }
  }

  static async getCustomerLifetimeValue(filters = {}) {
    try {
      const { where, params } = this.buildReportFilters(filters);
      const sql = `
        SELECT o.buyer_id, u.username, u.email, COUNT(*) as order_count, SUM(o.total) as lifetime_value,
               MIN(o.created_at) as first_order, MAX(o.created_at) as last_order
        FROM orders o
        JOIN users u ON u.id = o.buyer_id
        LEFT JOIN checkouts c ON c.order_id = o.id
        ${where}
        GROUP BY o.buyer_id
        ORDER BY lifetime_value DESC
        LIMIT 20
      `;
      const [rows] = await pool.query(sql, params);
      return rows.map(row => ({
        ...row,
        order_count: Number(row.order_count),
        lifetime_value: parseFloat(row.lifetime_value || 0)
      }));
    } catch (err) {
      console.error('[Order.getCustomerLifetimeValue] Error:', err);
      throw err;
    }
  }

  static async getCustomerRepeatSummary(filters = {}) {
    try {
      const { where, params } = this.buildReportFilters(filters);
      const sql = `
        SELECT
          COUNT(*) as total_orders,
          SUM(summary.lifetime_value) as total_revenue,
          COUNT(DISTINCT summary.buyer_id) as unique_customers,
          SUM(summary.order_count > 1) as repeat_customers,
          ROUND(AVG(summary.order_count), 2) as avg_orders_per_customer
        FROM (
          SELECT o.buyer_id, COUNT(*) as order_count, SUM(o.total) as lifetime_value
          FROM orders o
          LEFT JOIN checkouts c ON c.order_id = o.id
          ${where}
          GROUP BY o.buyer_id
        ) summary
      `;
      const [rows] = await pool.query(sql, params);
      return rows[0] || {
        total_orders: 0,
        total_revenue: 0,
        unique_customers: 0,
        repeat_customers: 0,
        avg_orders_per_customer: 0
      };
    } catch (err) {
      console.error('[Order.getCustomerRepeatSummary] Error:', err);
      throw err;
    }
  }
}

module.exports = Order;

