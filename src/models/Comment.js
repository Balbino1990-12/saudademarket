const { pool } = require('../config/database');

class Comment {
  static async getAll({ status, productId, page, perPage } = {}) {
    const whereClauses = [];
    const params = [];

    if (status) {
      whereClauses.push('c.status = ?');
      params.push(status);
    }

    if (productId) {
      whereClauses.push('c.product_id = ?');
      params.push(productId);
    }

    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*) as total FROM comments c ${whereSql}`;
    const [countRows] = await pool.query(countSql, params);
    const total = (countRows[0] && countRows[0].total) ? countRows[0].total : 0;

    let limitSql = '';
    const limitParams = [];
    if (page && perPage) {
      const safePage = Number(page) > 0 ? Number(page) : 1;
      const safePerPage = Number(perPage) > 0 ? Number(perPage) : 20;
      const offset = (safePage - 1) * safePerPage;
      limitSql = 'LIMIT ? OFFSET ?';
      limitParams.push(safePerPage, offset);
    }

    const sql = `
      SELECT c.*, u.username as user_username, u.email as user_email, p.name_en as product_name
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN products p ON c.product_id = p.id
      ${whereSql}
      ORDER BY c.created_at DESC
      ${limitSql}
    `;

    const [rows] = await pool.query(sql, [...params, ...limitParams]);
    return { total, comments: rows };
  }

  static async getById(id) {
    const sql = `SELECT * FROM comments WHERE id = ?`;
    const [rows] = await pool.query(sql, [id]);
    return rows[0] || null;
  }

  static async getByProductId(productId) {
    const sql = `
      SELECT c.*, u.username as user_username, u.email as user_email
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.product_id = ? AND c.status = 'approved'
      ORDER BY c.created_at DESC
    `;
    const [rows] = await pool.query(sql, [productId]);
    return rows;
  }

  static async getByUserId(userId) {
    const sql = `SELECT * FROM comments WHERE user_id = ? ORDER BY created_at DESC`;
    const [rows] = await pool.query(sql, [userId]);
    return rows;
  }

  static async getByUserAndProduct(userId, productId) {
    const sql = `SELECT * FROM comments WHERE user_id = ? AND product_id = ? LIMIT 1`;
    const [rows] = await pool.query(sql, [userId, productId]);
    return rows[0] || null;
  }

  static async create(comment) {
    const sql = `
      INSERT INTO comments (user_id, product_id, title, body, rating, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.query(sql, [
      comment.user_id || null,
      comment.product_id || null,
      comment.title || null,
      comment.body,
      comment.rating || null,
      comment.status || 'pending'
    ]);
    return this.getById(result.insertId);
  }

  static async update(id, comment) {
    const sql = `
      UPDATE comments SET user_id = ?, product_id = ?, title = ?, body = ?, rating = ?, status = ?
      WHERE id = ?
    `;
    await pool.query(sql, [
      comment.user_id || null,
      comment.product_id || null,
      comment.title || null,
      comment.body || null,
      comment.rating || null,
      comment.status || 'pending',
      id
    ]);
    return this.getById(id);
  }

  static async delete(id) {
    const sql = `DELETE FROM comments WHERE id = ?`;
    await pool.query(sql, [id]);
    return true;
  }
}

module.exports = Comment;
