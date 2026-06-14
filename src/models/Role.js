const { pool } = require('../config/database');

class Role {
  /**
   * Parse permissions if they're a JSON string
   * @param {Object} role - Role object
   * @returns {Object} Role with parsed permissions
   */
  static normalizePermissions(role) {
    if (!role) return role;
    
    if (typeof role.permissions === 'string') {
      
      try {
        role.permissions = JSON.parse(role.permissions);
      } catch (err) {
        console.error('[Role.normalizePermissions] Failed to parse permissions:', err);
        role.permissions = {};
      }
    }
    return role;
  }

  /**
   * Get all roles
   * @returns {Promise<Array>} Array of role objects
   */
  static async getAll() {
    try {
      const [roles] = await pool.query(
        'SELECT * FROM roles ORDER BY name ASC'
      );
      console.log('[Role.getAll] Retrieved', roles.length, 'roles');
      // Parse permissions for each role
      return roles.map(role => this.normalizePermissions(role));
    } catch (err) {
      console.error('[Role.getAll] Error:', err);
      throw err;
    }
  }

  /**
   * Get role by ID
   * @param {string} id - Role ID
   * @returns {Promise<Object|null>} Role object or null if not found
   */
  static async getById(id) {
    try {
      const [result] = await pool.query(
        'SELECT * FROM roles WHERE id = ?',
        [id]
      );
      const role = result.length > 0 ? result[0] : null;
      console.log('[Role.getById] Retrieved role:', role?.name || 'Not found');
      return this.normalizePermissions(role);
    } catch (err) {
      console.error('[Role.getById] Error:', err);
      throw err;
    }
  }

  /**
   * Create a new role
   * @param {Object} roleData - Role object with required fields
   * @returns {Promise<Object>} Created role
   */
  static async create(roleData) {
    try {
      console.log('[Role.create] Creating role:', roleData.name);

      // Check if role already exists
      const exists = await this.existsByName(roleData.name);
      if (exists) {
        throw new Error('Role with this name already exists');
      }

      const sql = `
        INSERT INTO roles (name, description, permissions, active)
        VALUES (?, ?, ?, ?)
      `;

      const result = await pool.query(sql, [
        roleData.name,
        roleData.description || '',
        roleData.permissions ? JSON.stringify(roleData.permissions) : null,
        roleData.active !== undefined ? roleData.active : true
      ]);

      console.log('[Role.create] ✅ Role created:', roleData.name);
      const insertedId = result[0].insertId;
      return await this.getById(insertedId);
    } catch (err) {
      console.error('[Role.create] ❌ Error creating role:', err);
      throw err;
    }
  }

  /**
   * Update a role
   * @param {string} id - Role ID
   * @param {Object} roleData - Updated role data
   * @returns {Promise<Object>} Updated role
   */
  static async update(id, roleData) {
    try {
      console.log('[Role.update] Updating role:', id);

      const updates = [];
      const values = [];

      if (roleData.name !== undefined) {
        // Check if new name already exists
        const [result] = await pool.query(
          'SELECT id FROM roles WHERE name = ? AND id != ?',
          [roleData.name, id]
        );
        if (result.length > 0) {
          throw new Error('Role with this name already exists');
        }
        updates.push('name = ?');
        values.push(roleData.name);
      }
      if (roleData.description !== undefined) {
        updates.push('description = ?');
        values.push(roleData.description);
      }
      if (roleData.permissions !== undefined) {
        updates.push('permissions = ?');
        values.push(roleData.permissions ? JSON.stringify(roleData.permissions) : null);
      }
      if (roleData.active !== undefined) {
        updates.push('active = ?');
        values.push(roleData.active);
      }

      if (updates.length === 0) return await this.getById(id);

      values.push(id);
      const sql = `UPDATE roles SET ${updates.join(', ')} WHERE id = ?`;

      await pool.query(sql, values);

      console.log('[Role.update] ✅ Role updated:', id);
      return await this.getById(id);
    } catch (err) {
      console.error('[Role.update] ❌ Error updating role:', err);
      throw err;
    }
  }

  /**
   * Delete a role
   * @param {string} id - Role ID
   * @returns {Promise<void>}
   */
  static async delete(id) {
    try {
      console.log('[Role.delete] Deleting role:', id);
      await pool.query('DELETE FROM roles WHERE id = ?', [id]);
      console.log('[Role.delete] ✅ Role deleted:', id);
    } catch (err) {
      console.error('[Role.delete] ❌ Error deleting role:', err);
      throw err;
    }
  }

  /**
   * Count total roles
   * @returns {Promise<number>} Total count
   */
  static async count() {
    try {
      const [result] = await pool.query('SELECT COUNT(*) as count FROM roles');
      return result[0].count;
    } catch (err) {
      console.error('[Role.count] Error:', err);
      throw err;
    }
  }

  /**
   * Check if role exists by ID
   * @param {string} id - Role ID
   * @returns {Promise<boolean>}
   */
  static async exists(id) {
    try {
      const role = await this.getById(id);
      return role !== null;
    } catch (err) {
      console.error('[Role.exists] Error:', err);
      throw err;
    }
  }

  /**
   * Check if role exists by name
   * @param {string} name - Role name
   * @returns {Promise<boolean>}
   */
  static async existsByName(name) {
    try {
      const [result] = await pool.query('SELECT id FROM roles WHERE name = ?', [name]);
      return result.length > 0;
    } catch (err) {
      console.error('[Role.existsByName] Error:', err);
      throw err;
    }
  }

  /**
   * Get role by name
   * @param {string} name - Role name
   * @returns {Promise<Object|null>} Role object or null if not found
   */
  static async getByName(name) {
    try {
      const [result] = await pool.query(
        'SELECT * FROM roles WHERE LOWER(name) = LOWER(?)',
        [name]
      );
      const role = result.length > 0 ? result[0] : null;
      console.log('[Role.getByName] Retrieved role:', role?.name || 'Not found', 'for input:', name);
      return this.normalizePermissions(role);
    } catch (err) {
      console.error('[Role.getByName] Error:', err);
      throw err;
    }
  }
}

module.exports = Role;

