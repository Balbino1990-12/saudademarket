const { pool } = require('../config/database');
const CacheService = require('../services/CacheService');
const { slugify } = require('../utils/helpers');

class Product {
  /**
   * Search products by name, description, or category
   * Uses fulltext index for product names and descriptions for better performance
   * @param {string} query - Search query
   * @returns {Promise<Array>} Array of matching products
   */
  static async search(query, limit = null) {
    let sql = `
      SELECT p.*, c.name_en as category_name, c.name_fr as category_name_fr, c.name_pt as category_name_pt, c.icon as category_icon,
             u.username as user_username, u.email as user_email,
             (
               SELECT AVG(rating)
               FROM comments com
               WHERE com.product_id = p.id
                 AND com.status = 'approved'
                 AND com.rating IS NOT NULL
             ) AS average_rating,
             CASE 
               WHEN MATCH(p.name_en, p.name_fr, p.name_pt, p.description) AGAINST(? IN BOOLEAN MODE) THEN 1
               ELSE 0
             END as fulltext_match
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE (
        MATCH(p.name_en, p.name_fr, p.name_pt, p.description) AGAINST(? IN BOOLEAN MODE) OR
        c.name_en LIKE ? OR
        c.name_fr LIKE ? OR
        c.name_pt LIKE ?
      )
      ORDER BY fulltext_match DESC, p.created_at DESC
    `;
    const like = `%${query}%`;
    const params = [query, query, like, like, like];
    if (limit !== null && Number.isInteger(limit) && limit > 0) {
      sql += ' LIMIT ?';
      params.push(limit);
    }
    return this.executeQuery(sql, params, '[Product.search] Retrieved products for query:');
  }

  /**
   * Search products by user and query
   * Uses fulltext index for product names and descriptions for better performance
   * @param {number} userId - User ID
   * @param {string} query - Search query
   * @returns {Promise<Array>} Array of matching products for this user
   */
  static async searchByUserId(userId, query, limit = null) {
    let sql = `
      SELECT p.*, c.name_en as category_name, c.name_fr as category_name_fr, c.name_pt as category_name_pt, c.icon as category_icon,
             u.username as user_username, u.email as user_email,
             (
               SELECT AVG(rating)
               FROM comments com
               WHERE com.product_id = p.id
                 AND com.status = 'approved'
                 AND com.rating IS NOT NULL
             ) AS average_rating,
             CASE 
               WHEN MATCH(p.name_en, p.name_fr, p.name_pt, p.description) AGAINST(? IN BOOLEAN MODE) THEN 1
               ELSE 0
             END as fulltext_match
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.user_id = ?
      AND (
        MATCH(p.name_en, p.name_fr, p.name_pt, p.description) AGAINST(? IN BOOLEAN MODE) OR
        c.name_en LIKE ? OR
        c.name_fr LIKE ? OR
        c.name_pt LIKE ?
      )
      ORDER BY fulltext_match DESC, p.created_at DESC
    `;
    const like = `%${query}%`;
    const params = [query, userId, query, like, like, like];
    if (limit !== null && Number.isInteger(limit) && limit > 0) {
      sql += ' LIMIT ?';
      params.push(limit);
    }
    return this.executeQuery(sql, params, '[Product.searchByUserId] Retrieved products for user and query:');
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
   * Get all products with category and user information (cached)
   * @returns {Promise<Array>} Array of product objects with category and user details
   */
  static async getAll(limit = null) {
    const cacheKey = limit ? `products:all:limit:${limit}` : CacheService.CACHE_KEYS.PRODUCTS_ALL;

    return CacheService.getOrSet(
      cacheKey,
      async () => {
        let sql = `
          SELECT p.*,
                 c.name_en as category_name, c.name_fr as category_name_fr, c.name_pt as category_name_pt, c.icon as category_icon,
                 u.username as user_username, u.email as user_email,
                 (
                   SELECT AVG(rating)
                   FROM comments com
                   WHERE com.product_id = p.id
                     AND com.status = 'approved'
                     AND com.rating IS NOT NULL
                 ) AS average_rating
          FROM products p
          LEFT JOIN categories c ON p.category_id = c.id
          LEFT JOIN users u ON p.user_id = u.id
          ORDER BY p.created_at DESC
        `;
        const params = [];
        if (limit !== null && Number.isInteger(limit) && limit > 0) {
          sql += ' LIMIT ?';
          params.push(limit);
        }
        return this.executeQuery(sql, params, '[Product.getAll] Retrieved all products from database');
      },
      CacheService.CACHE_TTL.MEDIUM
    );
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
   * Count total number of all products
   * @returns {Promise<number>} Total count of products
   */
  static async count() {
    const sql = 'SELECT COUNT(*) as count FROM products';
    const [rows] = await pool.query(sql);
    const count = rows[0]?.count || 0;
    console.log('[Product.count] Total products:', count);
    return count;
  }

  /**
   * Get product by ID with category and user information
   * @param {string} id - Product ID
   * @returns {Promise<Object|null>} Product object with category and user details or null
   */
  static async getById(id, connection = null) {
    const sql = `
      SELECT p.*, c.name_en as category_name, c.name_fr as category_name_fr, 
             c.name_pt as category_name_pt, c.icon as category_icon,
             u.username as user_username, u.email as user_email, u.first_name as user_first_name, u.last_name as user_last_name,
             (
               SELECT AVG(rating)
               FROM comments com
               WHERE com.product_id = p.id
                 AND com.status = 'approved'
                 AND com.rating IS NOT NULL
             ) AS average_rating
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `;

    if (connection) {
      const [rows] = await connection.query(sql, [id]);
      return rows.length > 0 ? rows[0] : null;
    }

    return CacheService.getOrSet(
      CacheService.CACHE_KEYS.PRODUCT_BY_ID(id),
      async () => {
        const [rows] = await pool.query(sql, [id]);
        console.log('[Product.getById] Retrieved product:', rows.length ? rows[0].id : null);
        return rows.length > 0 ? rows[0] : null;
      },
      CacheService.CACHE_TTL.MEDIUM
    );
  }

  static async getBySlug(slug) {
    if (!slug) return null;

    const normalizedSlug = slugify(String(slug).trim());
    if (!normalizedSlug) return null;

    const sql = `
      SELECT p.*, c.name_en as category_name, c.name_fr as category_name_fr,
             c.name_pt as category_name_pt, c.icon as category_icon,
             u.username as user_username, u.email as user_email, u.first_name as user_first_name, u.last_name as user_last_name,
             (
               SELECT AVG(rating)
               FROM comments com
               WHERE com.product_id = p.id
                 AND com.status = 'approved'
                 AND com.rating IS NOT NULL
             ) AS average_rating
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.slug = ?
    `;

    const [rows] = await pool.query(sql, [normalizedSlug]);
    if (rows.length > 0) {
      return rows[0];
    }

    // Fallback: try case-insensitive or denormalized match
    const fallbackSql = `
      SELECT p.*, c.name_en as category_name, c.name_fr as category_name_fr,
             c.name_pt as category_name_pt, c.icon as category_icon,
             u.username as user_username, u.email as user_email, u.first_name as user_first_name, u.last_name as user_last_name,
             (
               SELECT AVG(rating)
               FROM comments com
               WHERE com.product_id = p.id
                 AND com.status = 'approved'
                 AND com.rating IS NOT NULL
             ) AS average_rating
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE LOWER(p.slug) = LOWER(?) OR LOWER(p.slug) = ?
      LIMIT 1
    `;

    const [fallbackRows] = await pool.query(fallbackSql, [normalizedSlug, normalizedSlug]);
    return fallbackRows.length > 0 ? fallbackRows[0] : null;
  }

  static async getByName(name) {
    if (!name) return null;
    const value = String(name).trim();
    if (!value) return null;

    const sql = `
      SELECT p.*, c.name_en as category_name, c.name_fr as category_name_fr,
             c.name_pt as category_name_pt, c.icon as category_icon,
             u.username as user_username, u.email as user_email, u.first_name as user_first_name, u.last_name as user_last_name,
             (
               SELECT AVG(rating)
               FROM comments com
               WHERE com.product_id = p.id
                 AND com.status = 'approved'
                 AND com.rating IS NOT NULL
             ) AS average_rating
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE LOWER(p.name_en) = ?
         OR LOWER(p.name_fr) = ?
         OR LOWER(p.name_pt) = ?
      LIMIT 1
    `;

    const lowerValue = value.toLowerCase();
    const [rows] = await pool.query(sql, [lowerValue, lowerValue, lowerValue]);
    return rows.length > 0 ? rows[0] : null;
  }

  static async getBySlugOrName(value) {
    if (!value) return null;
    const trimmed = String(value).trim();
    const normalizedSlug = slugify(trimmed);

    // Try exact normalized slug match first
    if (normalizedSlug) {
      const productBySlug = await this.getBySlug(normalizedSlug);
      if (productBySlug) return productBySlug;
    }

    // Try exact name match
    const productByName = await this.getByName(trimmed);
    if (productByName) return productByName;

    // Fallback: search by normalized language variants of the product name
    if (normalizedSlug) {
      const fuzzySql = `
        SELECT p.*, c.name_en as category_name, c.name_fr as category_name_fr,
               c.name_pt as category_name_pt, c.icon as category_icon,
               u.username as user_username, u.email as user_email, u.first_name as user_first_name, u.last_name as user_last_name,
               (
                 SELECT AVG(rating)
                 FROM comments com
                 WHERE com.product_id = p.id
                   AND com.status = 'approved'
                   AND com.rating IS NOT NULL
               ) AS average_rating
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN users u ON p.user_id = u.id
        WHERE LOWER(p.name_en) LIKE ? OR LOWER(p.name_fr) LIKE ? OR LOWER(p.name_pt) LIKE ?
        LIMIT 20
      `;
      const likeValue = `%${trimmed.toLowerCase()}%`;
      const [fuzzyRows] = await pool.query(fuzzySql, [likeValue, likeValue, likeValue]);
      for (const row of fuzzyRows) {
        if (slugify(row.name_en) === normalizedSlug || slugify(row.name_fr) === normalizedSlug || slugify(row.name_pt) === normalizedSlug) {
          return row;
        }
      }
    }

    return null;
  }

  static async getByIdentifier(identifier) {
    if (!identifier) return null;
    const value = String(identifier).trim();

    if (/^\d+$/.test(value)) {
      const product = await this.getById(value);
      if (product) return product;
    }

    return this.getBySlug(value);
  }

  static async generateUniqueSlug(source, excludeId = null) {
    let base = slugify(source || 'product');
    if (!base) base = 'product';

    let slug = base;
    let count = 1;
    while (true) {
      const params = excludeId ? [slug, excludeId] : [slug];
      const query = `SELECT id FROM products WHERE slug = ?${excludeId ? ' AND id <> ?' : ''} LIMIT 1`;
      const [rows] = await pool.query(query, params);
      if (rows.length === 0) {
        return slug;
      }
      slug = `${base}-${count}`;
      count += 1;
    }
  }

  /**
   * Get all products in a specific category
   * @param {string} categoryId - Category ID
   * @returns {Promise<Array>} Array of products in the category
   */
  static async getByCategoryId(categoryId) {
    const sql = `
      SELECT p.*, c.name_en as category_name, c.name_fr as category_name_fr, c.name_pt as category_name_pt, c.icon as category_icon,
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
  static async getByUserId(userId, limit = null) {
    let sql = `
      SELECT p.*, c.name_en as category_name, c.name_fr as category_name_fr, c.name_pt as category_name_pt, c.icon as category_icon,
             u.username as user_username, u.email as user_email
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
    `;
    const params = [userId];
    if (limit !== null && Number.isInteger(limit) && limit > 0) {
      sql += ' LIMIT ?';
      params.push(limit);
    }
    const [rows] = await pool.query(sql, params);
    console.log('[Product.getByUserId] Retrieved', rows.length, 'products for user:', userId);
    return rows;
  }

  /**
   * Create a new product
   * @param {Object} product - Product object with user_id
   * @returns {Promise<Object>} Created product
   */
  static async create(product) {
    const slug = await this.generateUniqueSlug(product.slug || product.name_en || product.name_fr || product.name_pt || `product-${Date.now()}`);
    const sql = `INSERT INTO products (slug, name_en, name_fr, name_pt, category_id, user_id, quantity, price, is_featured, promo_price, promo_label, promo_expires_at, image, description, rating, specs) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const result = await pool.query(sql, [
      slug,
      product.name_en,
      product.name_fr,
      product.name_pt,
      product.category_id,
      product.user_id,
      product.quantity ?? 0,
      product.price,
      product.is_featured ? 1 : 0,
      product.promo_price || null,
      product.promo_label || null,
      product.promo_expires_at || null,
      product.image || null,
      product.description || null,
      product.rating ?? null,
      product.specs ? JSON.stringify(product.specs) : null
    ]);
    console.log('[Product.create] ✅ Product created:', product.name_en);
    const insertedId = result[0].insertId;

    // Invalidate product cache
    CacheService.delByPattern('products:');

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
    const existing = await this.getById(id);
    const slugSource = product.slug || product.name_en || existing?.name_en || existing?.name_fr || existing?.name_pt || `product-${id}`;
    const slug = await this.generateUniqueSlug(slugSource, id);
    const sql = `UPDATE products SET slug=?, name_en=?, name_fr=?, name_pt=?, category_id=?, quantity=?, price=?, is_featured=?, promo_price=?, promo_label=?, promo_expires_at=?, image=?, description=?, rating=?, specs=? WHERE id=?`;
    await pool.query(sql, [
      slug,
      product.name_en,
      product.name_fr,
      product.name_pt,
      product.category_id,
      product.quantity ?? 0,
      product.price,
      product.is_featured ? 1 : 0,
      product.promo_price || null,
      product.promo_label || null,
      product.promo_expires_at || null,
      product.image || null,
      product.description || null,
      product.rating ?? null,
      product.specs ? JSON.stringify(product.specs) : null,
      id
    ]);
    console.log('[Product.update] ✅ Product updated:', id);

    // Invalidate product cache
    CacheService.delByPattern('products:');
    CacheService.del(CacheService.CACHE_KEYS.PRODUCT_BY_ID(id));

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

    // Invalidate product cache
    CacheService.delByPattern('products:');
    CacheService.del(CacheService.CACHE_KEYS.PRODUCT_BY_ID(id));
  }

  /**
   * Decrement product quantity by the requested amount
   * @param {string|number} productId - Product ID
   * @param {number} amount - Quantity to subtract
   * @returns {Promise<Object>} Updated product
   * @throws {Error} If product is not found or insufficient stock
   */
  static async decrementQuantity(productId, amount, connection = null) {
    const prod = await this.getById(productId, connection);
    if (!prod) {
      throw new Error(`Product not found: ${productId}`);
    }

    if (typeof amount !== 'number' || amount <= 0) {
      throw new Error('Invalid quantity decrement amount');
    }

    if (prod.quantity < amount) {
      throw new Error(`Insufficient stock for product ${prod.name_en || prod.id}`);
    }

    const updateSql = `
      UPDATE products
      SET quantity = quantity - ?
      WHERE id = ? AND quantity >= ?
    `;

    const queryTarget = connection || pool;
    const [result] = await queryTarget.query(updateSql, [amount, productId, amount]);

    if (result.affectedRows === 0) {
      throw new Error(`Insufficient stock for product ${prod.name_en || prod.id}`);
    }

    return await this.getById(productId, connection);
  }

  /**
   * Increment product quantity by the requested amount (stock return or restock)
   * @param {string|number} productId - Product ID
   * @param {number} amount - Quantity to add
   * @returns {Promise<Object>} Updated product
   */
  static async incrementQuantity(productId, amount, connection = null) {
    const prod = await this.getById(productId, connection);
    if (!prod) {
      throw new Error(`Product not found: ${productId}`);
    }

    if (typeof amount !== 'number' || amount <= 0) {
      throw new Error('Invalid quantity increment amount');
    }

    const updateSql = `
      UPDATE products
      SET quantity = quantity + ?
      WHERE id = ?
    `;

    const queryTarget = connection || pool;
    await queryTarget.query(updateSql, [amount, productId]);

    return await this.getById(productId, connection);
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

