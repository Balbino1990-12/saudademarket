const User = require('./User');
const bcrypt = require('bcryptjs');

class Admin {
  /**
   * Authenticate admin user against the users table
   * @param {string} username - Username
   * @param {string} password - Password
   * @returns {Promise<Object|null>} User object if authenticated, null otherwise
   */
  static async authenticate(username, password) {
    try {
      console.log(`[Admin.authenticate] Authenticating admin user: ${username}`);
      
      // Get user by username from users table
      const user = await User.getByUsername(username);
      
      if (!user) {
        console.warn(`[Admin.authenticate] User not found: ${username}`);
        return null;
      }

      // Check if user has admin role (using role_name from the users-roles relationship)
      if (user.role_name !== 'Admin') {
        console.warn(`[Admin.authenticate] User is not an admin. Current role: ${user.role_name || 'None'}`);
        return null;
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        console.warn(`[Admin.authenticate] Invalid password for user: ${username}`);
        return null;
      }

      console.log(`[Admin.authenticate] ✅ Authentication successful for: ${username}`);
      return {
        id: user.id,
        username: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role_name: user.role_name,
        role_id: user.role_id
      };
    } catch (err) {
      console.error(`[Admin.authenticate] Error authenticating admin:`, err);
      return null;
    }
  }

  /**
   * Generate authentication token
   * @returns {string} Random token
   */
  static generateToken() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
}

module.exports = Admin;