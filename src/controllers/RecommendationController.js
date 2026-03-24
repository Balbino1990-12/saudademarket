const RecommendationService = require('../services/RecommendationService');

class RecommendationController {
  static async getSearchRecommendations(req, res, next) {
    try {
      const query = req.query.q || req.query.search || '';
      const limit = parseInt(req.query.limit, 10) || 10;

      const recommendations = await RecommendationService.getSearchRecommendations(query, limit);

      res.json({
        success: true,
        query,
        data: recommendations,
        count: recommendations.length
      });
    } catch (error) {
      console.error('[RecommendationController.getSearchRecommendations] Error:', error);
      next(error);
    }
  }

  /**
   * Get personalized recommendations for a user
   */
  static async getRecommendations(req, res, next) {
    try {
      const userId = req.user?.id || req.session?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      const limit = parseInt(req.query.limit) || 10;
      const recommendations = await RecommendationService.getRecommendations(userId, limit);

      res.json({
        success: true,
        data: recommendations,
        count: recommendations.length
      });
    } catch (error) {
      console.error('[RecommendationController.getRecommendations] Error:', error);
      next(error);
    }
  }

  /**
   * Get similar products for a specific product
   */
  static async getSimilarProducts(req, res, next) {
    try {
      const { productId } = req.params;
      const limit = parseInt(req.query.limit) || 5;

      if (!productId) {
        return res.status(400).json({
          success: false,
          error: 'Product ID is required'
        });
      }

      const recommendations = await RecommendationService.getSimilarProducts(productId, limit);

      res.json({
        success: true,
        data: recommendations,
        count: recommendations.length
      });
    } catch (error) {
      console.error('[RecommendationController.getSimilarProducts] Error:', error);
      next(error);
    }
  }

  /**
   * Get popular products
   */
  static async getPopularProducts(req, res, next) {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const excludeUserCart = req.query.excludeCart === 'true';
      let excludeProductIds = [];

      if (excludeUserCart) {
        const userId = req.user?.id || req.session?.userId;
        if (userId) {
          const Cart = require('../models/Cart');
          const cartItems = await Cart.getByUserId(userId);
          excludeProductIds = cartItems.map(item => item.product_id);
        }
      }

      const recommendations = await RecommendationService.getPopularRecommendations(excludeProductIds, limit);

      res.json({
        success: true,
        data: recommendations,
        count: recommendations.length
      });
    } catch (error) {
      console.error('[RecommendationController.getPopularProducts] Error:', error);
      next(error);
    }
  }

  /**
   * Track product view (for analytics)
   */
  static async trackProductView(req, res, next) {
    try {
      const { productId } = req.params;
      const userId = req.user?.id || req.session?.userId;

      if (!productId) {
        return res.status(400).json({
          success: false,
          error: 'Product ID is required'
        });
      }

      await RecommendationService.trackProductView(userId, productId);

      res.json({
        success: true,
        message: 'Product view tracked'
      });
    } catch (error) {
      console.error('[RecommendationController.trackProductView] Error:', error);
      next(error);
    }
  }
}

module.exports = RecommendationController;
