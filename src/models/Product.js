const { pool } = require('../config/database');

class Product {
  /**
   * Search products by name, description, or category
   * @param {string} query - Search query
   * @returns {Promise<Array>} Array of matching products
   */
  static async search(query) {
    const sql = `
      SELECT p.*, c.name_en as category_name, c.icon as category_icon,
             u.username as user_username, u.email as user_email
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE (
        p.name_en LIKE ? OR
        p.name_fr LIKE ? OR
        p.name_pt LIKE ? OR
        p.description LIKE ? OR
        c.name_en LIKE ? OR
        c.name_fr LIKE ? OR
        c.name_pt LIKE ?
      )
      ORDER BY p.created_at DESC
    `;
    const like = `%${query}%`;
    return this.executeQuery(sql, [like, like, like, like, like, like, like], '[Product.search] Retrieved products for query:');
  }

  /**
   * Search products by user and query
   * @param {number} userId - User ID
   * @param {string} query - Search query
   * @returns {Promise<Array>} Array of matching products for this user
   */
  static async searchByUserId(userId, query) {
    const sql = `
      SELECT p.*, c.name_en as category_name, c.icon as category_icon,
             u.username as user_username, u.email as user_email
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.user_id = ?
      AND (
        p.name_en LIKE ? OR
        p.name_fr LIKE ? OR
        p.name_pt LIKE ? OR
        p.description LIKE ? OR
        c.name_en LIKE ? OR
        c.name_fr LIKE ? OR
        c.name_pt LIKE ?
      )
      ORDER BY p.created_at DESC
    `;
    const like = `%${query}%`;
    return this.executeQuery(sql, [userId, like, like, like, like, like, like, like], '[Product.searchByUserId] Retrieved products for user and query:');
  }

  /**
   * Execute a query and log results
   * @param {string} sql - SQL query
   * @param {Array} params - Query parameters
   * @param {string} logMessage - Log message
   * @returns {Promise<Array>} Query results
   */
  static async executeQuery(sql, params, logMessage) {
    try {
      const [rows] = await pool.query(sql, params);
      console.log(logMessage, rows.length);
      return rows;
    } catch (err) {
      console.error('[Product.executeQuery] Error:', err);
      throw err;
    }
  }

  /**
   * Get all products with category and user information
   * @returns {Promise<Array>} Array of product objects with category and user details
   */
  static async getAll() {
    const sql = `
      SELECT p.*, 
             c.name_en as category_name, c.icon as category_icon,
             u.username as user_username, u.email as user_email
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
    `;
    return this.executeQuery(sql, [], '[Product.getAll] Retrieved all products');
  }

  /**
   * Count products by user ID
   * @param {number} userId - User ID
   * @returns {Promise<number>} Count of products from this user
   */
  static async countByUserId(userId) {
    const sql = 'SELECT COUNT(*) as count FROM products WHERE user_id = ?';
    const [rows] = await pool.query(sql, [userId]);
    return rows[0]?.count || 0;
  }

  /**
   * Get product by ID with category and user information
   * @param {string} id - Product ID
   * @returns {Promise<Object|null>} Product object with category and user details or null
   */
  static async getById(id) {
    const sql = `
      SELECT p.*, c.name_en as category_name, c.name_fr as category_name_fr, 
             c.name_pt as category_name_pt, c.icon as category_icon,
             u.username as user_username, u.email as user_email, u.first_name as user_first_name, u.last_name as user_last_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `;
    const rows = await this.executeQuery(sql, [id], '[Product.getById] Retrieved product:');
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Get all products in a specific category
   * @param {string} categoryId - Category ID
   * @returns {Promise<Array>} Array of products in the category
   */
  static async getByCategoryId(categoryId) {
    const sql = `
      SELECT p.*, c.name_en as category_name, c.icon as category_icon,
             u.username as user_username, u.email as user_email
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.category_id = ?
      ORDER BY p.name_en ASC
    `;
    const [rows] = await pool.query(sql, [categoryId]);
    console.log('[Product.getByCategoryId] Retrieved', rows.length, 'products for category:', categoryId);
    return rows;
  }

  /**
   * Get all products by user ID
   * @param {number} userId - User ID
   * @returns {Promise<Array>} Array of products from this user
   */
  static async getByUserId(userId) {
    const sql = `
      SELECT p.*, c.name_en as category_name, c.icon as category_icon,
             u.username as user_username, u.email as user_email
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
    `;
    const [rows] = await pool.query(sql, [userId]);
    console.log('[Product.getByUserId] Retrieved', rows.length, 'products for user:', userId);
    return rows;
  }

  /**
   * Create a new product
   * @param {Object} product - Product object with user_id
   * @returns {Promise<Object>} Created product
   */
  static async create(product) {
    const sql = `INSERT INTO products (name_en, name_fr, name_pt, category_id, user_id, quantity, price, image, description) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const result = await pool.query(sql, [
      product.name_en,
      product.name_fr,
      product.name_pt,
      product.category_id,
      product.user_id,
      product.quantity ?? 0,
      product.price,
      product.image || null,
      product.description || null
    ]);
    console.log('[Product.create] ✅ Product created:', product.name_en);
    const insertedId = result[0].insertId;
    return await this.getById(insertedId);
  }

  /**
   * Count products by user ID
   * @param {number} userId - User ID
   * @returns {Promise<number>} Count of products from this user
   */
  static async countByUserId(userId) {
    const sql = 'SELECT COUNT(*) as count FROM products WHERE user_id = ?';
    const [rows] = await pool.query(sql, [userId]);
    const count = rows[0].count;
    console.log('[Product.countByUserId] User', userId, 'has', count, 'products');
    return count;
  }

  /**
   * Update a product
   * @param {string} id - Product ID
   * @param {Object} product - Updated product data
   * @returns {Promise<Object>} Updated product
   */
  static async update(id, product) {
    const sql = `UPDATE products SET name_en=?, name_fr=?, name_pt=?, category_id=?, quantity=?, price=?, image=?, description=? WHERE id=?`;
    await pool.query(sql, [
      product.name_en,
      product.name_fr,
      product.name_pt,
      product.category_id,
      product.quantity ?? 0,
      product.price,
      product.image || null,
      product.description || null,
      id
    ]);
    console.log('[Product.update] ✅ Product updated:', id);
    return await this.getById(id);
  }

  /**
   * Check if a user owns a product
   * @param {number} productId - Product ID
   * @param {number} userId - User ID
   * @returns {Promise<boolean>} True if user owns the product
   */
  static async isOwner(productId, userId) {
    const sql = 'SELECT user_id FROM products WHERE id = ?';
    const [rows] = await pool.query(sql, [productId]);
    if (rows.length === 0) {
      console.log('[Product.isOwner] Product not found:', productId);
      return false;
    }
    const isProductOwner = rows[0].user_id === userId;
    console.log('[Product.isOwner] User', userId, isProductOwner ? 'is' : 'is not', 'owner of product', productId);
    return isProductOwner;
  }

  /**
   * Get user information for a product
   * @param {number} productId - Product ID
   * @returns {Promise<Object|null>} User object or null
   */
  static async getUser(productId) {
    const sql = `
      SELECT u.id, u.username, u.email, u.first_name, u.last_name
      FROM products p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `;
    const [rows] = await pool.query(sql, [productId]);
    const user = rows.length > 0 ? rows[0] : null;
    console.log('[Product.getUser] Retrieved user for product:', productId, user?.username || 'None');
    return user;
  }

  /**
   * Delete a product
   * @param {string} id - Product ID
   * @returns {Promise<void>}
   */
  static async delete(id) {
    const sql = 'DELETE FROM products WHERE id = ?';
    await this.executeQuery(sql, [id], '[Product.delete] ✅ Product deleted:');
  }

  /**
   * Count products in a category
   * @param {string} categoryId - Category ID
   * @returns {Promise<number>} Number of products in the category
   */
  static async countByCategory(categoryId) {
    const sql = `SELECT COUNT(*) as count FROM products WHERE category_id = ?`;
    const [rows] = await pool.query(sql, [categoryId]);
    const count = rows[0].count;
    console.log('[Product.countByCategory] Category', categoryId, 'has', count, 'products');
    return count;
  }
}

module.exports = Product;
