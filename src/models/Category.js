const { pool } = require('../config/database');

class Category {
  /**
   * Get all categories
   * @returns {Promise<Array>} Array of category objects
   */
  static async getAll() {
    try {
      const [categories] = await pool.query(
        'SELECT * FROM categories ORDER BY name_en ASC'
      );
      console.log('[Category.getAll] Retrieved', categories.length, 'categories');
      return categories;
    } catch (err) {
      console.error('[Category.getAll] Error:', err);
      throw err;
    }
  }

  /**
   * Get category by ID
   * @param {string} id - Category ID
   * @returns {Promise<Object|null>} Category object or null if not found
   */
  static async getById(id) {
    try {
      const [result] = await pool.query(
        'SELECT * FROM categories WHERE id = ?',
        [id]
      );
      const category = result.length > 0 ? result[0] : null;
      console.log('[Category.getById] Retrieved category:', category?.name_en || 'Not found');
      return category;
    } catch (err) {
      console.error('[Category.getById] Error:', err);
      throw err;
    }
  }

  /**
   * Create a new category
   * @param {Object} categoryData - Category object with multilingual names
   * @returns {Promise<Object>} Created category
   */
  static async create(categoryData) {
    try {
      console.log('[Category.create] Creating category:', categoryData.name_en);
      
      const sql = `
        INSERT INTO categories (name_en, name_fr, name_pt, description, icon, color, active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      const result = await pool.query(sql, [
        categoryData.name_en,
        categoryData.name_fr || categoryData.name_en,
        categoryData.name_pt || categoryData.name_en,
        categoryData.description || '',
        categoryData.icon || '📦',
        categoryData.color || '#c41e1e',
        categoryData.active !== undefined ? categoryData.active : true
      ]);

      console.log('[Category.create] ✅ Category created:', categoryData.name_en);
      const insertedId = result[0].insertId;
      return await this.getById(insertedId);
    } catch (err) {
      console.error('[Category.create] ❌ Error creating category:', err);
      throw err;
    }
  }

  /**
   * Update a category
   * @param {string} id - Category ID
   * @param {Object} categoryData - Updated category data
   * @returns {Promise<Object>} Updated category
   */
  static async update(id, categoryData) {
    try {
      console.log('[Category.update] Updating category:', id);

      const sql = `
        UPDATE categories SET
          name_en = ?, name_fr = ?, name_pt = ?, description = ?,
          icon = ?, color = ?, active = ?
        WHERE id = ?
      `;

      await pool.query(sql, [
        categoryData.name_en,
        categoryData.name_fr || categoryData.name_en,
        categoryData.name_pt || categoryData.name_en,
        categoryData.description || '',
        categoryData.icon || '📦',
        categoryData.color || '#c41e1e',
        categoryData.active !== undefined ? categoryData.active : true,
        id
      ]);

      console.log('[Category.update] ✅ Category updated:', categoryData.name_en);
      return await this.getById(id);
    } catch (err) {
      console.error('[Category.update] ❌ Error updating category:', err);
      throw err;
    }
  }

  /**
   * Delete a category
   * @param {string} id - Category ID
   * @returns {Promise<void>}
   */
  static async delete(id) {
    try {
      console.log('[Category.delete] Deleting category:', id);

      await pool.query('DELETE FROM categories WHERE id = ?', [id]);

      console.log('[Category.delete] ✅ Category deleted');
    } catch (err) {
      console.error('[Category.delete] ❌ Error deleting category:', err);
      throw err;
    }
  }

  /**
   * Get categories count
   * @returns {Promise<number>} Total number of categories
   */
  static async count() {
    try {
      const [result] = await pool.query('SELECT COUNT(*) as total FROM categories');
      return result[0].total;
    } catch (err) {
      console.error('[Category.count] Error:', err);
      throw err;
    }
  }

  /**
   * Check if category exists by name
   * @param {string} name - Category name (English)
   * @returns {Promise<boolean>}
   */
  static async existsByName(name) {
    try {
      const [result] = await pool.query(
        'SELECT COUNT(*) as count FROM categories WHERE name_en = ?',
        [name]
      );
      return result[0].count > 0;
    } catch (err) {
      console.error('[Category.existsByName] Error:', err);
      throw err;
    }
  }

  /**
   * Get a category with all its products
   * @param {string} id - Category ID
   * @returns {Promise<Object|null>} Category with products array or null
   */
  static async getWithProducts(id) {
    try {
      const category = await this.getById(id);
      if (!category) return null;

      const [products] = await pool.query(
        'SELECT id, name_en, name_fr, name_pt, price, image FROM products WHERE category_id = ? ORDER BY name_en ASC',
        [id]
      );

      return {
        ...category,
        products: products || [],
        product_count: products ? products.length : 0
      };
    } catch (err) {
      console.error('[Category.getWithProducts] Error:', err);
      throw err;
    }
  }

  /**
   * Get all categories with product counts
   * @returns {Promise<Array>} Array of categories with product counts
   */
  static async getAllWithProductCounts() {
    try {
      const sql = `
        SELECT 
          c.*,
          COUNT(p.id) as product_count
        FROM categories c
        LEFT JOIN products p ON c.id = p.category_id
        GROUP BY c.id
        ORDER BY c.name_en ASC
      `;
      const [categories] = await pool.query(sql);
      console.log('[Category.getAllWithProductCounts] Retrieved', categories.length, 'categories with product counts');
      return categories;
    } catch (err) {
      console.error('[Category.getAllWithProductCounts] Error:', err);
      throw err;
    }
  }

  /**
   * Get product count for a category
   * @param {string} categoryId - Category ID
   * @returns {Promise<number>} Number of products in the category
   */
  static async getProductCount(categoryId) {
    try {
      const [result] = await pool.query(
        'SELECT COUNT(*) as count FROM products WHERE category_id = ?',
        [categoryId]
      );
      const count = result[0].count;
      console.log('[Category.getProductCount] Category', categoryId, 'has', count, 'products');
      return count;
    } catch (err) {
      console.error('[Category.getProductCount] Error:', err);
      throw err;
    }
  }

  /**
   * Check if category can be deleted (no products associated)
   * @param {string} id - Category ID
   * @returns {Promise<boolean>} True if category has no products
   */
  static async canDelete(id) {
    try {
      const count = await this.getProductCount(id);
      const canDelete = count === 0;
      console.log('[Category.canDelete] Category', id, '- can delete:', canDelete);
      return canDelete;
    } catch (err) {
      console.error('[Category.canDelete] Error:', err);
      throw err;
    }
  }
}

module.exports = Category;
