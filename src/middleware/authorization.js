const Role = require('../models/Role');
const User = require('../models/User');

/**
 * Check if user has required permission
 * Middleware to verify user permissions before allowing API access
 */
function checkPermission(requiredPermission) {
  return async (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ error: 'No authorization token' });
      }

      // Get username from session (works for both admin and user sessions)
      const username = req.session?.adminUsername || req.session?.username;
      if (!username) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Admin user (from admin session) has all permissions
      if (username === 'admin') {
        console.log('[Authorization] ✅ Admin user - full access granted for:', requiredPermission);
        req.userRole = 'admin';
        req.userPermissions = {
          view_products: true,
          manage_products: true,
          view_categories: true,
          manage_categories: true,
          view_users: true,
          manage_users: true,
          manage_roles: true,
          view_activities: true,
          delete_activities: true,
          system_settings: true,
          manage_comments: true
        };

        // Ensure req.user exists for downstream controllers (required for user_id mapping)
        const adminUser = await User.getByUsername(username);
        if (adminUser) {
          req.user = adminUser;
        } else {
          // fallback to default id=1 if no admin user exists in users table
          req.user = { id: 1, username: 'admin' };
          console.warn('[Authorization] Admin user not found in users table; using fallback id=1');
        }

        return next();
      }

      // For regular users, get user and role from database
      let user = await User.getByUsername(username);
      if (!user) {
        console.warn('[Authorization] User not found in database:', username);
        return res.status(401).json({ error: 'User not found in system' });
      }

      console.log('[Authorization] User found:', { id: user.id, username: user.username, role_name: user.role_name, role_id: user.role_id });

      // Get user's role - ALWAYS have a fallback to seller role
      let userRole = null;
      let roleName = user.role_name;

      // Try to get the user's assigned role
      if (roleName) {
        console.log('[Authorization] Looking up role:', roleName);
        userRole = await Role.getByName(roleName);
        console.log('[Authorization] Role lookup result:', userRole ? 'Found' : 'Not found');
      }

      // If no role found and no role assigned, or if role doesn't exist, use default seller role
      if (!userRole) {
        console.log('[Authorization] Using fallback: assigning seller role for user:', username);
        userRole = await Role.getByName('seller');
        if (!userRole) {
          console.error('[Authorization] CRITICAL: Neither user role nor fallback seller role found');
          return res.status(500).json({ error: 'System configuration error: no roles available' });
        }
        roleName = 'seller';
        
        // Try to update user's role in database if it wasn't set
        if (!user.role_name) {
          try {
            console.log('[Authorization] Updating user role_id to seller:', userRole.id);
            await User.update(user.id, { role_id: userRole.id });
          } catch (updateErr) {
            console.warn('[Authorization] Could not persist role assignment:', updateErr.message);
          }
        }
      }

      // Check if role is active
      if (!userRole.active) {
        console.warn('[Authorization] Role is inactive:', roleName);
        return res.status(403).json({ error: 'User role is inactive' });
      }

      // Parse permissions from JSON if needed
      let permissions = userRole.permissions;
      if (typeof permissions === 'string') {
        try {
          permissions = JSON.parse(permissions);
        } catch (err) {
          console.error('[Authorization] Failed to parse permissions:', err);
          permissions = {};
        }
      }

      // Check if user has required permission
      if (!permissions[requiredPermission]) {
        console.warn('[Authorization] Permission denied for:', username, 'permission:', requiredPermission);
        return res.status(403).json({ 
          error: `Permission denied. Required: ${requiredPermission}` 
        });
      }

      // Attach user info to request for logging
      req.user = user;
      req.userRole = userRole.name;
      req.userPermissions = permissions;

      console.log('[Authorization] ✅ Permission granted:', {
        user: username,
        role: roleName,
        permission: requiredPermission
      });

      next();
    } catch (err) {
      console.error('[Authorization] Error checking permission:', err);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
}

module.exports = { checkPermission };

