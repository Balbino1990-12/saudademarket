const Role = require('../models/Role');
const Activity = require('../models/Activity');

class RoleController {
  /**
   * Get all roles
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async list(req, res) {
    try {
      console.log('[RoleController.list] Fetching all roles');
      const roles = await Role.getAll();
      res.json(roles);
    } catch (err) {
      console.error('[RoleController.list] Error:', err);
      res.status(500).json({ error: 'Failed to fetch roles' });
    }
  }

  /**
   * Get single role by ID
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async getOne(req, res) {
    try {
      const { id } = req.params;
      console.log('[RoleController.getOne] Fetching role:', id);

      const role = await Role.getById(id);
      if (!role) {
        return res.status(404).json({ error: 'Role not found' });
      }

      res.json(role);
    } catch (err) {
      console.error('[RoleController.getOne] Error:', err);
      res.status(500).json({ error: 'Failed to fetch role' });
    }
  }

  /**
   * Get role count
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async getCount(req, res) {
    try {
      console.log('[RoleController.getCount] Fetching role count');
      const count = await Role.count();
      res.json({ count });
    } catch (err) {
      console.error('[RoleController.getCount] Error:', err);
      res.status(500).json({ error: 'Failed to fetch count' });
    }
  }

  /**
   * Create new role
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async create(req, res) {
    try {
      const { name, description, permissions, active } = req.body;

      // Validation
      if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'Name is required' });
      }

      console.log('[RoleController.create] Creating role:', name);

      const roleData = {
        name: name.trim(),
        description: description || '',
        permissions: permissions || {},
        active: active !== undefined ? active : true
      };

      const newRole = await Role.create(roleData);

      // Log activity
      try {
        await Activity.log({
          action: 'role_added',
          details: `Role "${name}" created`,
          ip: req.ip,
          userAgent: req.get('user-agent')
        });
      } catch (actErr) {
        console.error('[RoleController.create] Activity logging error:', actErr);
      }

      res.status(201).json(newRole);
    } catch (err) {
      console.error('[RoleController.create] Error:', err);

      // Check for duplicate role error
      if (err.message?.includes('already exists')) {
        return res.status(409).json({ error: err.message });
      }

      res.status(500).json({ error: 'Failed to create role' });
    }
  }

  /**
   * Update role
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async update(req, res) {
    try {
      const { id } = req.params;
      const { name, description, permissions, active } = req.body;

      console.log('[RoleController.update] Updating role:', id);

      // Check if role exists
      const exists = await Role.exists(id);
      if (!exists) {
        return res.status(404).json({ error: 'Role not found' });
      }

      const roleData = {};
      if (name !== undefined) roleData.name = name.trim();
      if (description !== undefined) roleData.description = description;
      if (permissions !== undefined) roleData.permissions = permissions;
      if (active !== undefined) roleData.active = active;

      const updatedRole = await Role.update(id, roleData);

      // Log activity
      try {
        await Activity.log({
          action: 'role_updated',
          details: `Role "${name || 'unknown'}" updated`,
          ip: req.ip,
          userAgent: req.get('user-agent')
        });
      } catch (actErr) {
        console.error('[RoleController.update] Activity logging error:', actErr);
      }

      res.json(updatedRole);
    } catch (err) {
      console.error('[RoleController.update] Error:', err);

      if (err.message?.includes('already exists')) {
        return res.status(409).json({ error: err.message });
      }

      res.status(500).json({ error: 'Failed to update role' });
    }
  }

  /**
   * Delete role
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async delete(req, res) {
    try {
      const { id } = req.params;

      console.log('[RoleController.delete] Deleting role:', id);

      // Check if role exists
      const exists = await Role.exists(id);
      if (!exists) {
        return res.status(404).json({ error: 'Role not found' });
      }

      const role = await Role.getById(id);
      await Role.delete(id);

      // Log activity
      try {
        await Activity.log({
          action: 'role_deleted',
          details: `Role "${role.name}" deleted`,
          ip: req.ip,
          userAgent: req.get('user-agent')
        });
      } catch (actErr) {
        console.error('[RoleController.delete] Activity logging error:', actErr);
      }

      res.status(204).send();
    } catch (err) {
      console.error('[RoleController.delete] Error:', err);
      res.status(500).json({ error: 'Failed to delete role' });
    }
  }
}

module.exports = RoleController;

