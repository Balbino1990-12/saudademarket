const Specialties = require('../models/Specialties');

class SpecialtiesController {
  /**
   * Get all specialties
   */
  static async getAll(req, res) {
    try {
      console.log('[SpecialtiesController.getAll] Fetching all specialties');
      const specialties = await Specialties.getAll();
      res.json({
        success: true,
        count: specialties.length,
        data: specialties
      });
    } catch (error) {
      console.error('[SpecialtiesController.getAll] Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch specialties',
        error: error.message
      });
    }
  }

  /**
   * Get specialty by ID
   */
  static async getById(req, res) {
    try {
      const { id } = req.params;
      console.log('[SpecialtiesController.getById] Fetching specialty:', id);
      
      const specialty = await Specialties.getById(id);
      if (!specialty) {
        return res.status(404).json({
          success: false,
          message: 'Specialty not found'
        });
      }

      res.json({
        success: true,
        data: specialty
      });
    } catch (error) {
      console.error('[SpecialtiesController.getById] Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch specialty',
        error: error.message
      });
    }
  }

  /**
   * Get specialties by category
   */
  static async getByCategory(req, res) {
    try {
      const { category } = req.params;
      console.log('[SpecialtiesController.getByCategory] Fetching specialties for category:', category);
      
      const specialties = await Specialties.getByCategory(category);
      res.json({
        success: true,
        count: specialties.length,
        data: specialties
      });
    } catch (error) {
      console.error('[SpecialtiesController.getByCategory] Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch specialties',
        error: error.message
      });
    }
  }

  /**
   * Get all categories
   */
  static async getCategories(req, res) {
    try {
      console.log('[SpecialtiesController.getCategories] Fetching all categories');
      const categories = await Specialties.getCategories();
      res.json({
        success: true,
        count: categories.length,
        data: categories
      });
    } catch (error) {
      console.error('[SpecialtiesController.getCategories] Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch categories',
        error: error.message
      });
    }
  }

  /**
   * Create new specialty
   */
  static async create(req, res) {
    try {
      const { name_en, name_fr, name_pt, category, description, image, icon, color } = req.body;

      // Validation
      if (!name_en || !category) {
        return res.status(400).json({
          success: false,
          message: 'Name (English) and category are required'
        });
      }

      console.log('[SpecialtiesController.create] Creating new specialty:', name_en);

      const specialtyData = {
        name_en,
        name_fr: name_fr || name_en,
        name_pt: name_pt || name_en,
        category,
        description: description || '',
        image: image || null,
        icon: icon || null,
        color: color || null
      };

      const specialty = await Specialties.create(specialtyData);
      res.status(201).json({
        success: true,
        message: 'Specialty created successfully',
        data: specialty
      });
    } catch (error) {
      console.error('[SpecialtiesController.create] Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create specialty',
        error: error.message
      });
    }
  }

  /**
   * Update specialty
   */
  static async update(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      console.log('[SpecialtiesController.update] Updating specialty:', id);

      // Check if specialty exists
      const specialty = await Specialties.getById(id);
      if (!specialty) {
        return res.status(404).json({
          success: false,
          message: 'Specialty not found'
        });
      }

      const updated = await Specialties.update(id, updates);
      res.json({
        success: true,
        message: 'Specialty updated successfully',
        data: updated
      });
    } catch (error) {
      console.error('[SpecialtiesController.update] Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update specialty',
        error: error.message
      });
    }
  }

  /**
   * Delete specialty (soft delete)
   */
  static async delete(req, res) {
    try {
      const { id } = req.params;

      console.log('[SpecialtiesController.delete] Deleting specialty:', id);

      // Check if specialty exists
      const specialty = await Specialties.getById(id);
      if (!specialty) {
        return res.status(404).json({
          success: false,
          message: 'Specialty not found'
        });
      }

      const deleted = await Specialties.delete(id);
      if (!deleted) {
        return res.status(500).json({
          success: false,
          message: 'Failed to delete specialty'
        });
      }

      res.json({
        success: true,
        message: 'Specialty deleted successfully'
      });
    } catch (error) {
      console.error('[SpecialtiesController.delete] Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete specialty',
        error: error.message
      });
    }
  }
}

module.exports = SpecialtiesController;
