const { pool } = require('../config/database');
const CacheService = require('../services/CacheService');

class Category {
  /**
   * Get all categories (cached)
   * @returns {Promise<Array>} Array of category objects
   */
  static async getAll() {
    return CacheService.getOrSet(
      CacheService.CACHE_KEYS.CATEGORIES_ALL,
      async () => {
        try {
          const [categories] = await pool.query(
            'SELECT * FROM categories ORDER BY COALESCE(parent_id, id), name_en ASC'
          );
          console.log('[Category.getAll] Retrieved', categories.length, 'categories from database');
          return categories;
        } catch (err) {
          console.error('[Category.getAll] Error:', err);
          throw err;
        }
      },
      CacheService.CACHE_TTL.MEDIUM
    );
  }

  /**
   * Get category by ID (cached)
   * @param {string} id - Category ID
   * @returns {Promise<Object|null>} Category object or null if not found
   */
  static async getById(id) {
    return CacheService.getOrSet(
      CacheService.CACHE_KEYS.CATEGORY_BY_ID(id),
      async () => {
        try {
          const [result] = await pool.query(
            'SELECT * FROM categories WHERE id = ?',
            [id]
          );
          const category = result.length > 0 ? result[0] : null;
          console.log('[Category.getById] Retrieved category from database:', category?.name_en || 'Not found');
          return category;
        } catch (err) {
          console.error('[Category.getById] Error:', err);
          throw err;
        }
      },
      CacheService.CACHE_TTL.MEDIUM
    );
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
        INSERT INTO categories (name_en, name_fr, name_pt, description, icon, color, parent_id, active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const result = await pool.query(sql, [
        categoryData.name_en,
        categoryData.name_fr || categoryData.name_en,
        categoryData.name_pt || categoryData.name_en,
        categoryData.description || '',
        categoryData.icon || '📦',
        categoryData.color || '#c41e1e',
        categoryData.parent_id || null,
        categoryData.active !== undefined ? categoryData.active : true
      ]);

      console.log('[Category.create] ✅ Category created:', categoryData.name_en);
      const insertedId = result[0].insertId;

      // Invalidate cache
      CacheService.del(CacheService.CACHE_KEYS.CATEGORIES_ALL);

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
      const existingCategory = await this.getById(id);
      const iconValue = categoryData.icon !== undefined && categoryData.icon !== null && categoryData.icon !== ''
        ? categoryData.icon
        : (existingCategory?.icon || '📦');

      const sql = `
        UPDATE categories SET
          name_en = ?, name_fr = ?, name_pt = ?, description = ?,
          icon = ?, color = ?, parent_id = ?, active = ?
        WHERE id = ?
      `;

      await pool.query(sql, [
        categoryData.name_en,
        categoryData.name_fr || categoryData.name_en,
        categoryData.name_pt || categoryData.name_en,
        categoryData.description || '',
        iconValue,
        categoryData.color || '#c41e1e',
        categoryData.parent_id || null,
        categoryData.active !== undefined ? categoryData.active : true,
        id
      ]);

      console.log('[Category.update] ✅ Category updated:', categoryData.name_en);

      // Invalidate cache
      CacheService.del(CacheService.CACHE_KEYS.CATEGORIES_ALL);
      CacheService.del(CacheService.CACHE_KEYS.CATEGORY_BY_ID(id));

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

      // Invalidate cache
      CacheService.del(CacheService.CACHE_KEYS.CATEGORIES_ALL);
      CacheService.del(CacheService.CACHE_KEYS.CATEGORY_BY_ID(id));
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
   * Get count of direct child categories
   * @param {string} categoryId - Category ID
   * @returns {Promise<number>} Number of child categories
   */
  static async getChildrenCount(categoryId) {
    try {
      const [result] = await pool.query(
        'SELECT COUNT(*) as count FROM categories WHERE parent_id = ?',
        [categoryId]
      );
      const count = result[0].count;
      console.log('[Category.getChildrenCount] Category', categoryId, 'has', count, 'child categories');
      return count;
    } catch (err) {
      console.error('[Category.getChildrenCount] Error:', err);
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

  /**
   * Get category by slug (matches against name_en, name_fr, name_pt)
   * @param {string} slug - Category slug
   * @returns {Promise<Object|null>} Category object or null if not found
   */
  static async getBySlug(slug) {
    if (!slug) return null;

    const { slugify } = require('../utils/helpers');
    const normalizedSlug = slugify(String(slug).trim());
    if (!normalizedSlug) return null;

    try {
      const categories = await this.getAll();
      
      // Match against slugified versions of all name fields
      const matched = categories.find(cat => {
        const slugs = [
          slugify(cat.name_en || ''),
          slugify(cat.name_fr || ''),
          slugify(cat.name_pt || '')
        ].filter(Boolean);
        
        return slugs.includes(normalizedSlug);
      });

      if (matched) {
        console.log('[Category.getBySlug] Found category by slug:', normalizedSlug, '→', matched.name_en);
        return matched;
      }

      console.log('[Category.getBySlug] No category found for slug:', normalizedSlug);
      return null;
    } catch (err) {
      console.error('[Category.getBySlug] Error:', err);
      throw err;
    }
  }

  /**
   * Get category by slug or name (tries numeric ID first, then slug, then name)
   * @param {string} value - Category ID, slug, or name
   * @returns {Promise<Object|null>} Category object or null if not found
   */
  static async getBySlugOrId(value) {
    if (!value) return null;

    const trimmed = String(value).trim();

    // Try numeric ID first
    if (/^\d+$/.test(trimmed)) {
      const byId = await this.getById(trimmed);
      if (byId) return byId;
    }

    // Try slug-based lookup
    const bySlug = await this.getBySlug(trimmed);
    if (bySlug) return bySlug;

    return null;
  }

  /**
   * Get category with products, supporting both ID and slug
   * @param {string} idOrSlug - Category ID or slug
   * @returns {Promise<Object|null>} Category with products array or null
   */
  static async getWithProductsBySlugOrId(idOrSlug) {
    try {
      const category = await this.getBySlugOrId(idOrSlug);
      if (!category) return null;

      const [products] = await pool.query(
        'SELECT id, name_en, name_fr, name_pt, price, image FROM products WHERE category_id = ? ORDER BY name_en ASC',
        [category.id]
      );

      return {
        ...category,
        products: products || [],
        product_count: products ? products.length : 0
      };
    } catch (err) {
      console.error('[Category.getWithProductsBySlugOrId] Error:', err);
      throw err;
    }
  }
}

module.exports = Category;

