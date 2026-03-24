const { pool } = require('../config/database');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const RecommendationProduct = require('../models/RecommendationProduct');

class RecommendationService {
  static normalizeSearchText(value) {
    return (value || '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  static tokenizeSearchText(value) {
    return this.normalizeSearchText(value)
      .split(/[^a-z0-9]+/)
      .filter(Boolean);
  }

  static calculateSearchRecommendationScore(product, rawQuery, tokens) {
    const query = this.normalizeSearchText(rawQuery);
    const nameEn = this.normalizeSearchText(product.name_en);
    const nameFr = this.normalizeSearchText(product.name_fr);
    const namePt = this.normalizeSearchText(product.name_pt);
    const description = this.normalizeSearchText(product.description);
    const categoryName = this.normalizeSearchText(product.category_name);

    let score = 0;

    if (!query) {
      return score;
    }

    const searchableName = `${nameEn} ${nameFr} ${namePt}`.trim();
    const searchableText = `${searchableName} ${description} ${categoryName}`.trim();

    if (searchableName.includes(query)) {
      score += 140;
    }

    if (categoryName.includes(query)) {
      score += 60;
    }

    if (description.includes(query)) {
      score += 30;
    }

    for (const token of tokens) {
      if (!token) continue;

      if (nameEn.startsWith(token) || nameFr.startsWith(token) || namePt.startsWith(token)) {
        score += 35;
      }

      if (searchableName.includes(token)) {
        score += 22;
      }

      if (categoryName.includes(token)) {
        score += 14;
      }

      if (description.includes(token)) {
        score += 8;
      }

      if (searchableText.includes(token)) {
        score += 4;
      }
    }

    if (product.priority) {
      score += Number(product.priority) * 10;
    }

    return score;
  }

  static async getSearchRecommendations(query, limit = 10) {
    try {
      const normalizedQuery = this.normalizeSearchText(query);
      if (!normalizedQuery) {
        return await this.getPopularRecommendations([], limit);
      }

      const tokens = this.tokenizeSearchText(query);
      const [managedProducts, searchedProducts] = await Promise.all([
        RecommendationProduct.getActive(null, []),
        Product.search(query)
      ]);

      const uniqueProducts = new Map();

      for (const product of managedProducts) {
        uniqueProducts.set(product.id, product);
      }

      for (const product of searchedProducts) {
        const existing = uniqueProducts.get(product.id);
        uniqueProducts.set(product.id, existing ? { ...product, priority: existing.priority ?? product.priority } : product);
      }

      const rankedProducts = Array.from(uniqueProducts.values())
        .map(product => ({
          ...product,
          recommendation_score: this.calculateSearchRecommendationScore(product, query, tokens)
        }))
        .filter(product => product.recommendation_score > 0)
        .sort((a, b) => {
          if (b.recommendation_score !== a.recommendation_score) {
            return b.recommendation_score - a.recommendation_score;
          }

          const priorityA = Number(a.priority || 0);
          const priorityB = Number(b.priority || 0);
          if (priorityB !== priorityA) {
            return priorityB - priorityA;
          }

          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        });

      return rankedProducts.slice(0, limit);
    } catch (error) {
      console.error('[RecommendationService.getSearchRecommendations] Error:', error);
      return [];
    }
  }

  /**
   * Get product recommendations for a user
   * @param {number} userId - User ID
   * @param {number} limit - Maximum number of recommendations to return
   * @returns {Promise<Array>} Array of recommended products
   */
  static async getRecommendations(userId, limit = 10) {
    try {
      const recommendations = [];

      // 1. Get user's cart items to understand preferences
      const cartItems = await Cart.getByUserId(userId);
      const cartProductIds = cartItems.map(item => item.product_id);
      const cartCategoryIds = [...new Set(cartItems.map(item => item.category_id))];

      // 2. Managed recommendation products take priority when configured
      const managedRecommendations = await this.getManagedRecommendations(
        cartProductIds,
        Math.ceil(limit * 0.3)
      );
      recommendations.push(...managedRecommendations);

      const existingRecommendationIds = recommendations.map(product => product.id);
      const excludedIds = [...new Set([...cartProductIds, ...existingRecommendationIds])];

      // 3. Category-based recommendations (40% of recommendations)
      if (cartCategoryIds.length > 0) {
        const categoryRecommendations = await this.getCategoryBasedRecommendations(
          cartCategoryIds, excludedIds, Math.ceil(limit * 0.4)
        );
        recommendations.push(...categoryRecommendations);
      }

      const excludedAfterCategory = [...new Set([...excludedIds, ...recommendations.map(product => product.id)])];

      // 4. Collaborative filtering recommendations (30% of recommendations)
      const collaborativeRecommendations = await this.getCollaborativeRecommendations(
        userId, excludedAfterCategory, Math.ceil(limit * 0.3)
      );
      recommendations.push(...collaborativeRecommendations);

      const excludedAfterCollaborative = [...new Set([...excludedAfterCategory, ...recommendations.map(product => product.id)])];

      // 5. Popular products recommendations (20% of recommendations)
      const popularRecommendations = await this.getPopularRecommendations(
        excludedAfterCollaborative, Math.ceil(limit * 0.2)
      );
      recommendations.push(...popularRecommendations);

      const excludedAfterPopular = [...new Set([...excludedAfterCollaborative, ...recommendations.map(product => product.id)])];

      // 6. Trending/new products (10% of recommendations)
      const trendingRecommendations = await this.getTrendingRecommendations(
        excludedAfterPopular, Math.ceil(limit * 0.1)
      );
      recommendations.push(...trendingRecommendations);

      // Remove duplicates and limit results
      const uniqueRecommendations = this.removeDuplicates(recommendations);
      return uniqueRecommendations.slice(0, limit);

    } catch (error) {
      console.error('[RecommendationService.getRecommendations] Error:', error);
      // Fallback to popular products
      return await this.getPopularRecommendations([], limit);
    }
  }

  /**
   * Get recommendations based on product categories
   * @param {Array} categoryIds - Array of category IDs from user's cart
   * @param {Array} excludeProductIds - Product IDs to exclude (already in cart)
   * @param {number} limit - Maximum recommendations
   * @returns {Promise<Array>} Recommended products
   */
  static async getCategoryBasedRecommendations(categoryIds, excludeProductIds = [], limit = 5) {
    try {
      const placeholders = categoryIds.map(() => '?').join(',');
      const excludePlaceholders = excludeProductIds.length > 0 ? `AND p.id NOT IN (${excludeProductIds.map(() => '?').join(',')})` : '';

      const sql = `
        SELECT p.*, c.name_en as category_name, c.icon as category_icon
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.category_id IN (${placeholders})
        ${excludePlaceholders}
        ORDER BY p.created_at DESC
        LIMIT ?
      `;

      const params = [...categoryIds, ...excludeProductIds, limit];
      const [rows] = await pool.query(sql, params);

      console.log(`[RecommendationService.getCategoryBasedRecommendations] Found ${rows.length} category-based recommendations`);
      return rows;
    } catch (error) {
      console.error('[RecommendationService.getCategoryBasedRecommendations] Error:', error);
      return [];
    }
  }

  /**
   * Get collaborative filtering recommendations
   * Find products that users with similar cart items also have
   * @param {number} userId - Current user ID
   * @param {Array} userCartProductIds - Products in current user's cart
   * @param {number} limit - Maximum recommendations
   * @returns {Promise<Array>} Recommended products
   */
  static async getCollaborativeRecommendations(userId, userCartProductIds = [], limit = 5) {
    try {
      if (userCartProductIds.length === 0) {
        return [];
      }

      // Find users who have similar products in their cart
      const placeholders = userCartProductIds.map(() => '?').join(',');
      const sql = `
        SELECT DISTINCT c2.user_id, COUNT(*) as similarity_score
        FROM cart c1
        JOIN cart c2 ON c1.product_id = c2.product_id AND c1.user_id != c2.user_id
        WHERE c1.user_id = ? AND c2.user_id != ?
        GROUP BY c2.user_id
        ORDER BY similarity_score DESC
        LIMIT 10
      `;

      const [similarUsers] = await pool.query(sql, [userId, userId]);

      if (similarUsers.length === 0) {
        return [];
      }

      // Get products from similar users' carts that current user doesn't have
      const similarUserIds = similarUsers.map(u => u.user_id);
      const userPlaceholders = similarUserIds.map(() => '?').join(',');
      const excludePlaceholders = userCartProductIds.length > 0 ? `AND c.product_id NOT IN (${userCartProductIds.map(() => '?').join(',')})` : '';

      const productSql = `
        SELECT p.*, c.name_en as category_name, c.icon as category_icon,
               COUNT(*) as user_count
        FROM cart c
        LEFT JOIN products p ON c.product_id = p.id
        LEFT JOIN categories cat ON p.category_id = cat.id
        WHERE c.user_id IN (${userPlaceholders})
        ${excludePlaceholders}
        GROUP BY c.product_id
        ORDER BY user_count DESC, p.created_at DESC
        LIMIT ?
      `;

      const params = [...similarUserIds, ...userCartProductIds, limit];
      const [rows] = await pool.query(productSql, params);

      console.log(`[RecommendationService.getCollaborativeRecommendations] Found ${rows.length} collaborative recommendations`);
      return rows;
    } catch (error) {
      console.error('[RecommendationService.getCollaborativeRecommendations] Error:', error);
      return [];
    }
  }

  /**
   * Get popular products recommendations
   * @param {Array} excludeProductIds - Product IDs to exclude
   * @param {number} limit - Maximum recommendations
   * @returns {Promise<Array>} Popular products
   */
  static async getPopularRecommendations(excludeProductIds = [], limit = 5) {
    try {
      const managedRecommendations = await this.getManagedRecommendations(excludeProductIds, limit);
      const managedIds = managedRecommendations.map(product => product.id);
      const remaining = Math.max(limit - managedRecommendations.length, 0);

      if (remaining === 0) {
        return managedRecommendations;
      }

      const combinedExcludes = [...new Set([...excludeProductIds, ...managedIds])];
      const excludePlaceholders = combinedExcludes.length > 0 ? `AND p.id NOT IN (${combinedExcludes.map(() => '?').join(',')})` : '';

      const sql = `
        SELECT p.*, c.name_en as category_name, c.icon as category_icon,
               COUNT(cart.product_id) as cart_count
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN cart ON p.id = cart.product_id
        WHERE 1=1 ${excludePlaceholders}
        GROUP BY p.id
        ORDER BY cart_count DESC, p.created_at DESC
        LIMIT ?
      `;

      const params = [...combinedExcludes, remaining];
      const [rows] = await pool.query(sql, params);

      console.log(`[RecommendationService.getPopularRecommendations] Found ${rows.length} popular recommendations`);
      return [...managedRecommendations, ...rows];
    } catch (error) {
      console.error('[RecommendationService.getPopularRecommendations] Error:', error);
      return [];
    }
  }

  static async getManagedRecommendations(excludeProductIds = [], limit = 5) {
    try {
      const rows = await RecommendationProduct.getActive(limit, excludeProductIds);
      console.log(`[RecommendationService.getManagedRecommendations] Found ${rows.length} managed recommendations`);
      return rows;
    } catch (error) {
      console.error('[RecommendationService.getManagedRecommendations] Error:', error);
      return [];
    }
  }

  /**
   * Get trending/new products recommendations
   * @param {Array} excludeProductIds - Product IDs to exclude
   * @param {number} limit - Maximum recommendations
   * @returns {Promise<Array>} Trending products
   */
  static async getTrendingRecommendations(excludeProductIds = [], limit = 5) {
    try {
      const excludePlaceholders = excludeProductIds.length > 0 ? `AND p.id NOT IN (${excludeProductIds.map(() => '?').join(',')})` : '';

      const sql = `
        SELECT p.*, c.name_en as category_name, c.icon as category_icon
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE 1=1 ${excludePlaceholders}
        ORDER BY p.created_at DESC
        LIMIT ?
      `;

      const params = [...excludeProductIds, limit];
      const [rows] = await pool.query(sql, params);

      console.log(`[RecommendationService.getTrendingRecommendations] Found ${rows.length} trending recommendations`);
      return rows;
    } catch (error) {
      console.error('[RecommendationService.getTrendingRecommendations] Error:', error);
      return [];
    }
  }

  /**
   * Get recommendations for a specific product (similar products)
   * @param {number} productId - Product ID to get similar products for
   * @param {number} limit - Maximum recommendations
   * @returns {Promise<Array>} Similar products
   */
  static async getSimilarProducts(productId, limit = 5) {
    try {
      // Get the product's category
      const product = await Product.getById(productId);
      if (!product) {
        return [];
      }

      // Get products from same category, excluding the current product
      const sql = `
        SELECT p.*, c.name_en as category_name, c.icon as category_icon
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.category_id = ? AND p.id != ?
        ORDER BY p.created_at DESC
        LIMIT ?
      `;

      const [rows] = await pool.query(sql, [product.category_id, productId, limit]);

      console.log(`[RecommendationService.getSimilarProducts] Found ${rows.length} similar products for product ${productId}`);
      return rows;
    } catch (error) {
      console.error('[RecommendationService.getSimilarProducts] Error:', error);
      return [];
    }
  }

  /**
   * Remove duplicate products from recommendations array
   * @param {Array} recommendations - Array of product recommendations
   * @returns {Array} Array with duplicates removed
   */
  static removeDuplicates(recommendations) {
    const seen = new Set();
    return recommendations.filter(product => {
      if (seen.has(product.id)) {
        return false;
      }
      seen.add(product.id);
      return true;
    });
  }

  /**
   * Track product view for analytics
   * @param {number} userId - User ID (optional)
   * @param {number} productId - Product ID
   * @returns {Promise<void>}
   */
  static async trackProductView(userId, productId) {
    try {
      // This could be extended to store view analytics in a separate table
      // For now, we'll just log it
      console.log(`[RecommendationService.trackProductView] User ${userId || 'anonymous'} viewed product ${productId}`);
    } catch (error) {
      console.error('[RecommendationService.trackProductView] Error:', error);
    }
  }
}

module.exports = RecommendationService;
