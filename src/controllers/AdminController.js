const Admin = require('../models/Admin');
const SessionManager = require('../services/SessionManager');

class AdminController {
  static async login(req, res, next) {
    try {
      const { username, password } = req.body;
      
      console.log(`[AdminController.login] Login attempt for user: ${username}`);
      
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
      }

      // Authenticate admin user against users table
      const admin = await Admin.authenticate(username, password);
      
      if (!admin) {
        console.warn(`[AdminController.login] Login failed for user: ${username}`);
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate token and create session
      const token = Admin.generateToken();
      SessionManager.create(token, username);
      
      console.log(`[AdminController.login] ✅ Login successful for user: ${username}`);
      res.json({ success: true, token, user: { id: admin.id, username: admin.username, email: admin.email, role: admin.role_name } });
    } catch (err) {
      console.error(`[AdminController.login] Error during login:`, err);
      next(err);
    }
  }

  static async logout(req, res, next) {
    try {
      SessionManager.destroy(req.adminToken);
      console.log(`[AdminController] Logout successful`);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AdminController;