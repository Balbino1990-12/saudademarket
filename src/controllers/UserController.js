const crypto = require('crypto');
const User = require('../models/User');
const Role = require('../models/Role');
const Activity = require('../models/Activity');
const SessionManager = require('../services/SessionManager');

class UserController {
  /**
   * Public buyer registration endpoint
   * Allows a new buyer to register
   */
  static async register(req, res, next) {
    try {
      const { username, password, email, first_name, last_name, phone_number, city } = req.body;
      console.log('[Register] Request body:', req.body);

      // Assign "buyer" role by default
      let buyerRole = null;
      try {
        buyerRole = await Role.getByName('buyer');
      } catch (e) {
        // fallback: role_id null
      }
      const role_id = buyerRole ? buyerRole.id : null;

      // Email confirmation token
      const emailToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      // Create user (unconfirmed)
      const user = await User.create({
        username,
        password,
        email,
        first_name: first_name || '',
        last_name: last_name || '',
        phone_number: phone_number || null,
        city: city || null,
        role_id,
        active: true,
        email_confirmed: false,
        email_token: emailToken
      });

      // Send confirmation email
      try {
        const { sendConfirmationEmail } = require('../services/EmailService');
        await sendConfirmationEmail(email, emailToken);
      } catch (e) {
        console.error('[UserController.register] Email send error:', e);
      }

      // Optionally log activity (non-blocking)
      try {
        await Activity.logUserAdded({ username, first_name, last_name });
      } catch (e) {}

      res.status(201).json({
        success: true,
        user,
        message: 'Registration successful, please check your email to confirm.'
      });
    } catch (err) {
      console.error('[UserController.register] ❌ Register error:', err);
      // Detailed error response
      let status = 500;
      let errors = {};
      if (err.message && err.message.includes('Username already exists')) {
        status = 400;
        errors.username = 'Username already exists';
      }
      if (err.message && err.message.includes('Email already exists')) {
        status = 400;
        errors.email = 'Email already exists';
      }
      if (err.message && err.message.includes('Invalid email format')) {
        status = 400;
        errors.email = 'Invalid email format';
      }
      if (Object.keys(errors).length > 0) {
        return res.status(status).json({ success: false, errors });
      }
      res.status(status).json({ success: false, error: err.message || 'Error registering user' });
    }
  }

  /**
   * User login endpoint
   * Authenticates a user and returns a session token
   */
  static async login(req, res, next) {
    try {
      const { username, password } = req.body;
      
      console.log(`[UserController.login] Login attempt for user: ${username}`);
      
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
      }

      // Authenticate user against users table
      const user = await User.authenticate(username, password);
      
      if (!user) {
        console.warn(`[UserController.login] Login failed for user: ${username}`);
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      }

      // Check if user is NOT an admin (allow only regular users)
      if (user.role_name === 'Admin') {
        console.warn(`[UserController.login] Admin user cannot login via user portal: ${username}`);
        return res.status(403).json({ error: 'Admins must use admin portal' });
      }

      // If user has no role, assign default "seller" role
      let roleName = user.role_name;
      if (!roleName) {
        console.warn(`[UserController.login] User has no role assigned, assigning default "seller" role`);
        const sellerRole = await Role.getByName('seller');
        if (sellerRole) {
          await User.update(user.id, { role_id: sellerRole.id });
          roleName = 'seller';
          console.log(`[UserController.login] ✅ Assigned seller role to user: ${username}`);
        } else {
          console.error(`[UserController.login] Seller role not found in database`);
        }
      }

      // Fetch role and permissions
      let permissions = {};
      try {
        const role = await Role.getByName(roleName || user.role_name);
        if (role && role.permissions) {
          permissions = typeof role.permissions === 'string' 
            ? JSON.parse(role.permissions) 
            : role.permissions;
        }
        console.log(`[UserController.login] Loaded permissions for role "${roleName || user.role_name}":`, permissions);
      } catch (roleErr) {
        console.warn(`[UserController.login] Could not load role permissions:`, roleErr.message);
      }

      const token = crypto.randomBytes(24).toString('hex');
      SessionManager.create(token, user.username, user.id);

      // Store user session data
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.email = user.email;
      req.session.firstName = user.first_name;
      req.session.lastName = user.last_name;
      req.session.role = roleName || user.role_name;
      req.session.permissions = permissions;
      req.session.isUser = true;
      req.session.buyerId = user.id;
      
      console.log(`[UserController.login] ✅ Login successful for user: ${username}`);
      // Update last_login timestamp
      try {
        await User.setLastLogin(user.id);
      } catch (e) {
        console.warn('[UserController.login] Failed to update last_login:', e.message || e);
      }
      
      res.json({ 
        success: true,
        token,
        accessToken: token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          phone_number: user.phone_number,
          city: user.city,
          role: roleName || user.role_name,
          permissions: permissions,
          active: user.active
        }
      });
    } catch (err) {
      console.error(`[UserController.login] Error during login:`, err);
      next(err);
    }
  }

  /**
   * User logout endpoint
   * Destroys the user session
   */
  static async logout(req, res, next) {
    try {
      req.session.destroy((err) => {
        if (err) {
          console.error('[UserController.logout] Error destroying session:', err);
          return next(err);
        }
        console.log(`[UserController] Logout successful`);
        res.json({ success: true });
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get all users
   */
  static async list(req, res, next) {
    try {
      const users = await User.getAll();
      res.json(users);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get single user by ID
   */
  static async getOne(req, res, next) {
    try {
      const user = await User.getById(req.params.id);
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json(user);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get user count
   */
  static async getCount(req, res, next) {
    try {
      const count = await User.count();
      res.json({ count });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Create a new user
   */
  static async create(req, res, next) {
    try {
      const userData = req.body;

      // Validate required fields
      if (!userData.username || !userData.password) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: username, password'
        });
      }

      console.log('[UserController.create] Creating user with data:', { username: userData.username, email: userData.email });

      // Create user
      const user = await User.create(userData);

      console.log('[UserController.create] User created successfully, user object:', user);

      if (!user) {
        return res.status(500).json({
          success: false,
          error: 'User was created but could not be retrieved'
        });
      }

      // Log activity
      console.log('[UserController.create] User saved, now logging activity...');
      try {
        await Activity.logUserAdded({
          username: user.username,
          first_name: user.first_name,
          last_name: user.last_name
        });
        console.log('[UserController.create] ✅ Activity logged successfully');
      } catch (err) {
        console.error('[UserController.create] ⚠️ Activity logging failed (non-blocking):', err.message);
      }

      res.status(201).json({
        success: true,
        user,
        message: 'User created successfully'
      });
    } catch (err) {
      console.error('[UserController.create] ❌ Create user error:', err);
      res.status(err.message.includes('already exists') ? 409 : 500).json({
        success: false,
        error: err.message || 'Error creating user'
      });
    }
  }

  /**
   * Update a user
   */
  static async update(req, res, next) {
    try {
      const { id } = req.params;
      const userData = req.body;

      // Check if user exists
      const exists = await User.exists(id);
      if (!exists) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Update user
      const user = await User.update(id, userData);

      // Log activity
      console.log('[UserController.update] User updated, now logging activity...');
      try {
        await Activity.logUserUpdated({
          username: user.username,
          first_name: user.first_name,
          last_name: user.last_name
        });
        console.log('[UserController.update] ✅ Activity logged successfully');
      } catch (err) {
        console.error('[UserController.update] ⚠️ Activity logging failed (non-blocking):', err.message);
      }

      res.json({
        success: true,
        user,
        message: 'User updated successfully'
      });
    } catch (err) {
      console.error('Update user error:', err);
      res.status(err.message.includes('already exists') ? 409 : 500).json({
        success: false,
        error: err.message || 'Error updating user'
      });
    }
  }

  /**
   * Delete a user
   */
  static async delete(req, res, next) {
    try {
      const { id } = req.params;

      // Check if user exists
      const user = await User.getById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Delete user
      await User.delete(id);

      // Log activity
      console.log('[UserController.delete] User deleted, now logging activity...');
      try {
        await Activity.logUserDeleted({
          username: user.username,
          first_name: user.first_name,
          last_name: user.last_name
        });
        console.log('[UserController.delete] ✅ Activity logged successfully');
      } catch (err) {
        console.error('[UserController.delete] ⚠️ Activity logging failed (non-blocking):', err.message);
      }

      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (err) {
      console.error('Delete user error:', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Error deleting user'
      });
    }
  }
}

module.exports = UserController;

