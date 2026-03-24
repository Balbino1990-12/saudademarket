const Product = require('../models/Product');
const RecommendationProduct = require('../models/RecommendationProduct');

class RecommendationProductController {
  static async list(req, res, next) {
    try {
      const rows = await RecommendationProduct.getAll();
      res.json(rows);
    } catch (error) {
      next(error);
    }
  }

  static async listActive(req, res, next) {
    try {
      const limit = parseInt(req.query.limit, 10) || 10;
      const rows = await RecommendationProduct.getActive(limit);
      res.json(rows);
    } catch (error) {
      next(error);
    }
  }

  static async getOne(req, res, next) {
    try {
      const row = await RecommendationProduct.getById(req.params.id);
      if (!row) {
        return res.status(404).json({ error: 'Recommendation product not found' });
      }

      res.json(row);
    } catch (error) {
      next(error);
    }
  }

  static async create(req, res, next) {
    try {
      const productId = parseInt(req.body.product_id, 10);
      const priority = req.body.priority !== undefined ? parseInt(req.body.priority, 10) : 0;
      const active = req.body.active === undefined ? true : String(req.body.active) === 'true' || req.body.active === true;
      const createdBy = req.user?.id || null;

      if (!Number.isInteger(productId) || productId <= 0) {
        return res.status(400).json({ error: 'Valid product_id is required' });
      }

      const product = await Product.getById(productId);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const existing = await RecommendationProduct.getByProductId(productId);
      if (existing) {
        return res.status(409).json({ error: 'Product is already in recommendation products' });
      }

      const row = await RecommendationProduct.create({
        product_id: productId,
        priority: Number.isInteger(priority) ? priority : 0,
        active,
        created_by: createdBy
      });

      res.status(201).json({
        success: true,
        recommendationProduct: row
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req, res, next) {
    try {
      const existing = await RecommendationProduct.getById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Recommendation product not found' });
      }

      const updatePayload = {};

      if (req.body.product_id !== undefined) {
        const productId = parseInt(req.body.product_id, 10);
        if (!Number.isInteger(productId) || productId <= 0) {
          return res.status(400).json({ error: 'Valid product_id is required' });
        }

        const product = await Product.getById(productId);
        if (!product) {
          return res.status(404).json({ error: 'Product not found' });
        }

        const duplicate = await RecommendationProduct.getByProductId(productId);
        if (duplicate && duplicate.id !== parseInt(req.params.id, 10)) {
          return res.status(409).json({ error: 'Product is already in recommendation products' });
        }

        updatePayload.product_id = productId;
      }

      if (req.body.priority !== undefined) {
        const priority = parseInt(req.body.priority, 10);
        updatePayload.priority = Number.isInteger(priority) ? priority : 0;
      }

      if (req.body.active !== undefined) {
        updatePayload.active = String(req.body.active) === 'true' || req.body.active === true;
      }

      const row = await RecommendationProduct.update(req.params.id, updatePayload);

      res.json({
        success: true,
        recommendationProduct: row
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req, res, next) {
    try {
      const existing = await RecommendationProduct.getById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Recommendation product not found' });
      }

      await RecommendationProduct.delete(req.params.id);
      res.json({
        success: true,
        message: 'Recommendation product deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = RecommendationProductController;
