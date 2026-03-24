const { pool } = require('../config/database');

class Specialties {
  /**
   * Get all specialties
   * @returns {Promise<Array>} Array of specialty objects
   */
  static async getAll() {
    try {
      const sql = `
        SELECT * FROM specialties
        WHERE active = true
        ORDER BY created_at DESC
      `;
      const [rows] = await pool.query(sql);
      console.log('[Specialties.getAll] Retrieved', rows.length, 'specialties');
      return rows;
    } catch (err) {
      console.error('[Specialties.getAll] Error:', err);
      throw err;
    }
  }

  /**
   * Get specialty by ID
   * @param {number} id - Specialty ID
   * @returns {Promise<Object|null>} Specialty object or null
   */
  static async getById(id) {
    try {
      const sql = `
        SELECT * FROM specialties
        WHERE id = ? AND active = true
      `;
      const [rows] = await pool.query(sql, [id]);
      const specialty = rows.length > 0 ? rows[0] : null;
      console.log('[Specialties.getById] Retrieved specialty:', specialty?.name_en || 'Not found');
      return specialty;
    } catch (err) {
      console.error('[Specialties.getById] Error:', err);
      throw err;
    }
  }

  /**
   * Get specialties by category
   * @param {string} category - Category name
   * @returns {Promise<Array>} Array of specialty objects
   */
  static async getByCategory(category) {
    try {
      const sql = `
        SELECT * FROM specialties
        WHERE category = ? AND active = true
        ORDER BY created_at DESC
      `;
      const [rows] = await pool.query(sql, [category]);
      console.log('[Specialties.getByCategory] Retrieved', rows.length, 'specialties for category:', category);
      return rows;
    } catch (err) {
      console.error('[Specialties.getByCategory] Error:', err);
      throw err;
    }
  }

  /**
   * Create a new specialty
   * @param {Object} specialtyData - Specialty data
   * @returns {Promise<Object>} Created specialty with ID
   */
  static async create(specialtyData) {
    try {
      const {
        name_en, name_fr, name_pt, category, description,
        image, icon, color
      } = specialtyData;

      const sql = `
        INSERT INTO specialties 
        (name_en, name_fr, name_pt, category, description, image, icon, color, active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, true)
      `;

      const [result] = await pool.query(sql, [
        name_en, name_fr, name_pt, category, description || null,
        image || null, icon || null, color || null
      ]);

      console.log('[Specialties.create] Created specialty with ID:', result.insertId);
      return { id: result.insertId, ...specialtyData };
    } catch (err) {
      console.error('[Specialties.create] Error:', err);
      throw err;
    }
  }

  /**
   * Update specialty
   * @param {number} id - Specialty ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated specialty
   */
  static async update(id, updates) {
    try {
      const allowedFields = ['name_en', 'name_fr', 'name_pt', 'category', 'description', 
                            'image', 'icon', 'color', 'active'];
      
      const updateFields = Object.keys(updates)
        .filter(key => allowedFields.includes(key))
        .map(key => `${key} = ?`);

      if (updateFields.length === 0) {
        return this.getById(id);
      }

      const values = Object.keys(updates)
        .filter(key => allowedFields.includes(key))
        .map(key => updates[key]);

      const sql = `
        UPDATE specialties 
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      await pool.query(sql, [...values, id]);
      console.log('[Specialties.update] Updated specialty with ID:', id);
      return this.getById(id);
    } catch (err) {
      console.error('[Specialties.update] Error:', err);
      throw err;
    }
  }

  /**
   * Delete specialty (soft delete)
   * @param {number} id - Specialty ID
   * @returns {Promise<boolean>} Success status
   */
  static async delete(id) {
    try {
      const sql = `
        UPDATE specialties 
        SET active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      const [result] = await pool.query(sql, [id]);
      console.log('[Specialties.delete] Deleted specialty with ID:', id);
      return result.affectedRows > 0;
    } catch (err) {
      console.error('[Specialties.delete] Error:', err);
      throw err;
    }
  }

  /**
   * Get categories (unique values)
   * @returns {Promise<Array>} Array of category names
   */
  static async getCategories() {
    try {
      const sql = `
        SELECT DISTINCT category FROM specialties
        WHERE active = true
        ORDER BY category ASC
      `;
      const [rows] = await pool.query(sql);
      const categories = rows.map(row => row.category);
      console.log('[Specialties.getCategories] Retrieved', categories.length, 'categories');
      return categories;
    } catch (err) {
      console.error('[Specialties.getCategories] Error:', err);
      throw err;
    }
  }
}

module.exports = Specialties;
