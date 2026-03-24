const { pool } = require('../config/database');

class RecommendationProduct {
  static async getAll() {
    const sql = `
      SELECT rp.*,
             p.name_en,
             p.name_fr,
             p.name_pt,
             p.price,
             p.image,
             p.description,
             p.category_id,
             c.name_en AS category_name,
             c.icon AS category_icon,
             u.username AS created_by_username
      FROM recommendation_products rp
      INNER JOIN products p ON rp.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON rp.created_by = u.id
      ORDER BY rp.priority DESC, rp.updated_at DESC
    `;

    const [rows] = await pool.query(sql);
    return rows;
  }

  static async getActive(limit = null, excludeProductIds = []) {
    const params = [];
    let excludeSql = '';
    let limitSql = '';

    if (excludeProductIds.length > 0) {
      excludeSql = ` AND rp.product_id NOT IN (${excludeProductIds.map(() => '?').join(',')})`;
      params.push(...excludeProductIds);
    }

    if (Number.isInteger(limit) && limit > 0) {
      limitSql = ' LIMIT ?';
      params.push(limit);
    }

    const sql = `
      SELECT rp.*,
             p.name_en,
             p.name_fr,
             p.name_pt,
             p.price,
             p.image,
             p.description,
             p.category_id,
             c.name_en AS category_name,
             c.icon AS category_icon
      FROM recommendation_products rp
      INNER JOIN products p ON rp.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE rp.active = true
      ${excludeSql}
      ORDER BY rp.priority DESC, rp.updated_at DESC
      ${limitSql}
    `;

    const [rows] = await pool.query(sql, params);
    return rows;
  }

  static async getById(id) {
    const sql = `
      SELECT rp.*,
             p.name_en,
             p.name_fr,
             p.name_pt,
             p.price,
             p.image,
             p.description,
             p.category_id,
             c.name_en AS category_name,
             c.icon AS category_icon,
             u.username AS created_by_username
      FROM recommendation_products rp
      INNER JOIN products p ON rp.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON rp.created_by = u.id
      WHERE rp.id = ?
      LIMIT 1
    `;

    const [rows] = await pool.query(sql, [id]);
    return rows[0] || null;
  }

  static async getByProductId(productId) {
    const sql = `
      SELECT *
      FROM recommendation_products
      WHERE product_id = ?
      LIMIT 1
    `;

    const [rows] = await pool.query(sql, [productId]);
    return rows[0] || null;
  }

  static async create({ product_id, priority = 0, active = true, created_by = null }) {
    const sql = `
      INSERT INTO recommendation_products (product_id, priority, active, created_by)
      VALUES (?, ?, ?, ?)
    `;

    const [result] = await pool.query(sql, [
      product_id,
      priority,
      active,
      created_by
    ]);

    return this.getById(result.insertId);
  }

  static async update(id, { product_id, priority, active }) {
    const fields = [];
    const params = [];

    if (product_id !== undefined) {
      fields.push('product_id = ?');
      params.push(product_id);
    }

    if (priority !== undefined) {
      fields.push('priority = ?');
      params.push(priority);
    }

    if (active !== undefined) {
      fields.push('active = ?');
      params.push(active);
    }

    if (fields.length === 0) {
      return this.getById(id);
    }

    params.push(id);

    const sql = `
      UPDATE recommendation_products
      SET ${fields.join(', ')}
      WHERE id = ?
    `;

    await pool.query(sql, params);
    return this.getById(id);
  }

  static async delete(id) {
    await pool.query('DELETE FROM recommendation_products WHERE id = ?', [id]);
  }
}

module.exports = RecommendationProduct;
