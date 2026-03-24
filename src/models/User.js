
const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  /**
   * Get all users with role information
   * @returns {Promise<Array>} Array of user objects with role details
   */
  static async getAll() {
    try {
      const [users] = await pool.query(`
        SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.phone_number, u.city, 
               u.role_id, r.name as role_name, r.description as role_description,
               u.active, u.created_at, u.updated_at
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        ORDER BY u.created_at DESC
      `);
      console.log('[User.getAll] Retrieved', users.length, 'users');
      return users;
    } catch (err) {
      console.error('[User.getAll] Error:', err);
      throw err;
    }
  }

  /**
   * Get user by ID with role information
   * @param {string} id - User ID
   * @returns {Promise<Object|null>} User object with role details or null if not found
   */
  static async getById(id) {
    try {
      const [result] = await pool.query(`
        SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.phone_number, u.city,
               u.role_id, r.name as role_name, r.description as role_description,
               u.active, u.created_at, u.updated_at
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.id = ?
      `, [id]);
      const user = result.length > 0 ? result[0] : null;
      console.log('[User.getById] Retrieved user:', user?.username || 'Not found');
      return user;
    } catch (err) {
      console.error('[User.getById] Error:', err);
      throw err;
    }
  }

  /**
   * Get user by username with role information
   * @param {string} username - Username
   * @returns {Promise<Object|null>} User object with role info or null if not found
   */
  static async getByUsername(username) {
    try {
      const [result] = await pool.query(`
        SELECT u.*, r.name as role_name, r.description as role_description
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.username = ?
      `, [username]);
      return result.length > 0 ? result[0] : null;
    } catch (err) {
      console.error('[User.getByUsername] Error:', err);
      throw err;
    }
  }

  /**
   * Get user by email with role information
   * @param {string} email - Email
   * @returns {Promise<Object|null>} User object with role info or null if not found
   */
  static async getByEmail(email) {
    try {
      const [result] = await pool.query(`
        SELECT u.*, r.name as role_name, r.description as role_description
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.email = ?
      `, [email]);
      return result.length > 0 ? result[0] : null;
    } catch (err) {
      console.error('[User.getByEmail] Error:', err);
      throw err;
    }
  }

  /**
   * Create a new user
   * @param {Object} userData - User object with required fields (role_id is optional)
   * @returns {Promise<Object>} Created user
   */
  static async create(userData) {
    try {
      console.log('[User.create] Creating user:', userData.username);

      // Check if username already exists
      const existingUser = await this.getByUsername(userData.username);
      if (existingUser) {
        throw new Error('Username already exists');
      }

      // Check if email already exists
      if (userData.email) {
        const [result] = await pool.query('SELECT id FROM users WHERE email = ?', [userData.email]);
        if (result.length > 0) {
          throw new Error('Email already exists');
        }
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      const sql = `
        INSERT INTO users (username, email, password, first_name, last_name, phone_number, city, role_id, active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const result = await pool.query(sql, [
        userData.username,
        userData.email || null,
        hashedPassword,
        userData.first_name || '',
        userData.last_name || '',
        userData.phone_number || null,
        userData.city || null,
        userData.role_id || null,
        userData.active !== undefined ? userData.active : true
      ]);

      console.log('[User.create] ✅ User created with ID:', result[0].insertId);
      
      const createdUser = await this.getByUsername(userData.username);
      console.log('[User.create] Retrieved created user:', createdUser);
      
      if (!createdUser) {
        console.error('[User.create] ❌ Failed to retrieve created user:', userData.username);
        throw new Error('User created but could not be retrieved from database');
      }
      
      return createdUser;
    } catch (err) {
      console.error('[User.create] ❌ Error creating user:', err);
      throw err;
    }
  }

  /**
   * Update a user
   * @param {string} id - User ID
   * @param {Object} userData - Updated user data
   * @returns {Promise<Object>} Updated user
   */
  static async update(id, userData) {
    try {
      console.log('[User.update] Updating user:', id);

      // Check if email is being changed and is unique
      if (userData.email) {
        const [result] = await pool.query(
          'SELECT id FROM users WHERE email = ? AND id != ?',
          [userData.email, id]
        );
        if (result.length > 0) {
          throw new Error('Email already exists');
        }
      }

      const updates = [];
      const values = [];

      if (userData.email !== undefined) {
        updates.push('email = ?');
        values.push(userData.email);
      }
      if (userData.first_name !== undefined) {
        updates.push('first_name = ?');
        values.push(userData.first_name);
      }
      if (userData.last_name !== undefined) {
        updates.push('last_name = ?');
        values.push(userData.last_name);
      }
      if (userData.phone_number !== undefined) {
        updates.push('phone_number = ?');
        values.push(userData.phone_number);
      }
      if (userData.city !== undefined) {
        updates.push('city = ?');
        values.push(userData.city);
      }
      if (userData.role_id !== undefined) {
        updates.push('role_id = ?');
        values.push(userData.role_id);
      }
      if (userData.active !== undefined) {
        updates.push('active = ?');
        values.push(userData.active);
      }
      if (userData.password) {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        updates.push('password = ?');
        values.push(hashedPassword);
      }

      if (updates.length === 0) return await this.getById(id);

      values.push(id);
      const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;

      await pool.query(sql, values);

      console.log('[User.update] ✅ User updated:', id);
      return await this.getById(id);
    } catch (err) {
      console.error('[User.update] ❌ Error updating user:', err);
      throw err;
    }
  }

  /**
   * Delete a user
   * @param {string} id - User ID
   * @returns {Promise<void>}
   */
  static async delete(id) {
    try {
      console.log('[User.delete] Deleting user:', id);
      await pool.query('DELETE FROM users WHERE id = ?', [id]);
      console.log('[User.delete] ✅ User deleted:', id);
    } catch (err) {
      console.error('[User.delete] ❌ Error deleting user:', err);
      throw err;
    }
  }

  /**
   * Count total users
   * @returns {Promise<number>} Total count
   */
  static async count() {
    try {
      const [result] = await pool.query('SELECT COUNT(*) as count FROM users');
      return result[0].count;
    } catch (err) {
      console.error('[User.count] Error:', err);
      throw err;
    }
  }

  /**
   * Check if user exists by ID
   * @param {string} id - User ID
   * @returns {Promise<boolean>}
   */
  static async exists(id) {
    try {
      const user = await this.getById(id);
      return user !== null;
    } catch (err) {
      console.error('[User.exists] Error:', err);
      throw err;
    }
  }

  /**
   * Authenticate user
   * @param {string} username - Username
   * @param {string} password - Password
   * @returns {Promise<Object|null>} User object if authenticated, null otherwise
   */
  static async authenticate(username, password) {
    try {
      // Try username first
      let user = await this.getByUsername(username);
      // If not found, try as email
      if (!user && username && username.includes('@')) {
        user = await this.getByEmail(username);
      }
      if (!user) return null;

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) return null;

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role_id: user.role_id,
        role_name: user.role_name
      };
    } catch (err) {
      console.error('[User.authenticate] Error:', err);
      throw err;
    }
  }

  /**
   * Get all users by role ID
   * @param {number} roleId - Role ID
   * @returns {Promise<Array>} Array of users with this role
   */
  static async getByRoleId(roleId) {
    try {
      const [users] = await pool.query(`
        SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.phone_number, u.city,
               u.role_id, r.name as role_name, r.description as role_description,
               u.active, u.created_at, u.updated_at
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.role_id = ?
        ORDER BY u.created_at DESC
      `, [roleId]);
      console.log('[User.getByRoleId] Retrieved', users.length, 'users for role:', roleId);
      return users;
    } catch (err) {
      console.error('[User.getByRoleId] Error:', err);
      throw err;
    }
  }

  /**
   * Count users by role ID
   * @param {number} roleId - Role ID
   * @returns {Promise<number>} Count of users with this role
   */
  static async countByRoleId(roleId) {
    try {
      const [result] = await pool.query(
        'SELECT COUNT(*) as count FROM users WHERE role_id = ?',
        [roleId]
      );
      const count = result[0].count;
      console.log('[User.countByRoleId] Role', roleId, 'has', count, 'users');
      return count;
    } catch (err) {
      console.error('[User.countByRoleId] Error:', err);
      throw err;
    }
  }

  /**
   * Get role information for a user
   * @param {number} userId - User ID
   * @returns {Promise<Object|null>} Role object or null if user has no role
   */
  static async getRole(userId) {
    try {
      const [result] = await pool.query(`
        SELECT r.id, r.name, r.description, r.permissions, r.active
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.id = ?
      `, [userId]);
      const role = result.length > 0 ? result[0] : null;
      console.log('[User.getRole] Retrieved role for user:', userId, role?.name || 'None');
      return role;
    } catch (err) {
      console.error('[User.getRole] Error:', err);
      throw err;
    }
  }

  /**
   * Assign a role to a user
   * @param {number} userId - User ID
   * @param {number} roleId - Role ID
   * @returns {Promise<Object>} Updated user
   */
  static async assignRole(userId, roleId) {
    try {
      console.log('[User.assignRole] Assigning role', roleId, 'to user', userId);
      await pool.query('UPDATE users SET role_id = ? WHERE id = ?', [roleId, userId]);
      console.log('[User.assignRole] ✅ Role assigned');
      return await this.getById(userId);
    } catch (err) {
      console.error('[User.assignRole] ❌ Error assigning role:', err);
      throw err;
    }
  }

  /**
   * Remove role from a user
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Updated user
   */
  static async removeRole(userId) {
    try {
      console.log('[User.removeRole] Removing role from user', userId);
      await pool.query('UPDATE users SET role_id = NULL WHERE id = ?', [userId]);
      console.log('[User.removeRole] ✅ Role removed');
      return await this.getById(userId);
    } catch (err) {
      console.error('[User.removeRole] ❌ Error removing role:', err);
      throw err;
    }
  }
}

module.exports = User;
