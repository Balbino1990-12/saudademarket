const Category = require('../models/Category');
const Activity = require('../models/Activity');

class CategoryController {
  /**
   * Get all categories
   */
  static async list(req, res, next) {
    try {
      const categories = await Category.getAll();
      res.json(categories);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get single category by ID or slug
   */
  static async getOne(req, res, next) {
    try {
      const category = await Category.getBySlugOrId(req.params.id);
      if (!category) return res.status(404).json({ error: 'Category not found' });
      res.json(category);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Create a new category
   */
  static async create(req, res, next) {
    try {
      const categoryData = req.body;
      if (req.file) {
        categoryData.icon = `/images/${req.file.filename}`;
      }
      if (categoryData.active !== undefined) {
        categoryData.active = categoryData.active === 'true' || categoryData.active === true;
      }

      // Validate required fields
      if (!categoryData.name_en) {
        return res.status(400).json({
          success: false,
          error: 'Missing required field: name_en'
        });
      }

      // Validate parent category if provided
      if (categoryData.parent_id) {
        categoryData.parent_id = Number(categoryData.parent_id);
        if (Number.isNaN(categoryData.parent_id)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid parent_id'
          });
        }
        const parentCategory = await Category.getById(categoryData.parent_id);
        if (!parentCategory) {
          return res.status(400).json({
            success: false,
            error: 'Parent category not found'
          });
        }
      } else {
        categoryData.parent_id = null;
      }

      // Check if category already exists
      const exists = await Category.existsByName(categoryData.name_en);
      if (exists) {
        return res.status(409).json({
          success: false,
          error: 'Category with this name already exists'
        });
      }

      // Create category
      const category = await Category.create(categoryData);

      // Log activity
      console.log('[CategoryController.create] Category saved, now logging activity...');
      try {
        await Activity.logCategoryAdded({
          name_en: category.name_en,
          name_fr: category.name_fr,
          name_pt: category.name_pt
        });
        console.log('[CategoryController.create] ✅ Activity logged successfully');
      } catch (err) {
        console.error('[CategoryController.create] ⚠️ Activity logging failed (non-blocking):', err.message);
      }

      res.status(201).json({
        success: true,
        category,
        message: 'Category created successfully'
      });
    } catch (err) {
      console.error('Create category error:', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Error creating category'
      });
    }
  }

  /**
   * Update a category
   */
  static async update(req, res, next) {
    try {
      const id = req.params.id;
      const categoryData = req.body;
      if (req.file) {
        categoryData.icon = `/images/${req.file.filename}`;
      }
      if (categoryData.active !== undefined) {
        categoryData.active = categoryData.active === 'true' || categoryData.active === true;
      }

      // Check if category exists
      const existing = await Category.getById(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'Category not found'
        });
      }

      // Validate required fields
      if (!categoryData.name_en) {
        return res.status(400).json({
          success: false,
          error: 'Missing required field: name_en'
        });
      }

      // Validate parent category if provided
      if (categoryData.parent_id) {
        categoryData.parent_id = Number(categoryData.parent_id);
        if (Number.isNaN(categoryData.parent_id)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid parent_id'
          });
        }
        if (categoryData.parent_id === Number(id)) {
          return res.status(400).json({
            success: false,
            error: 'Category cannot be its own parent'
          });
        }
        const parentCategory = await Category.getById(categoryData.parent_id);
        if (!parentCategory) {
          return res.status(400).json({
            success: false,
            error: 'Parent category not found'
          });
        }
      } else {
        categoryData.parent_id = null;
      }

      // Update category
      const updated = await Category.update(id, categoryData);

      // Log activity
      console.log('[CategoryController.update] Category updated, now logging activity...');
      try {
        await Activity.logCategoryUpdated({
          name_en: updated.name_en,
          name_fr: updated.name_fr,
          name_pt: updated.name_pt
        });
        console.log('[CategoryController.update] ✅ Activity logged successfully');
      } catch (err) {
        console.error('[CategoryController.update] ⚠️ Activity logging failed (non-blocking):', err.message);
      }

      res.json({
        success: true,
        category: updated,
        message: 'Category updated successfully'
      });
    } catch (err) {
      console.error('Update category error:', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Error updating category'
      });
    }
  }

  /**
   * Delete a category
   */
  static async delete(req, res, next) {
    try {
      const id = req.params.id;

      // Check if category exists
      const existing = await Category.getById(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'Category not found'
        });
      }

      // Check if category has child categories
      const childCount = await Category.getChildrenCount(id);
      if (childCount > 0) {
        return res.status(409).json({
          success: false,
          error: `Cannot delete category with ${childCount} child category(ies). Please reassign or delete child categories first.`,
          child_count: childCount
        });
      }

      // Check if category has products
      const productCount = await Category.getProductCount(id);
      if (productCount > 0) {
        return res.status(409).json({
          success: false,
          error: `Cannot delete category with ${productCount} product(s). Please reassign or delete products first.`,
          product_count: productCount
        });
      }

      // Delete category
      await Category.delete(id);

      // Log activity
      console.log('[CategoryController.delete] Category deleted, now logging activity...');
      try {
        await Activity.logCategoryDeleted({
          name_en: existing.name_en,
          name_fr: existing.name_fr,
          name_pt: existing.name_pt
        });
        console.log('[CategoryController.delete] ✅ Activity logged successfully');
      } catch (err) {
        console.error('[CategoryController.delete] ⚠️ Activity logging failed (non-blocking):', err.message);
      }

      res.json({
        success: true,
        message: 'Category deleted successfully'
      });
    } catch (err) {
      console.error('Delete category error:', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Error deleting category'
      });
    }
  }

  /**
   * Get category count
   */
  static async getCount(req, res, next) {
    try {
      const count = await Category.count();
      res.json({ count });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get all categories with product counts
   */
  static async getAllWithProductCounts(req, res, next) {
    try {
      const categories = await Category.getAllWithProductCounts();
      res.json(categories);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get category with its products (supports both ID and slug)
   */
  static async getWithProducts(req, res, next) {
    try {
      const category = await Category.getWithProductsBySlugOrId(req.params.id);
      if (!category) {
        return res.status(404).json({ error: 'Category not found' });
      }
      res.json(category);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = CategoryController;

