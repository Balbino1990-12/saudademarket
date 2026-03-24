const express = require('express');
const router = express.Router();
const RecommendationController = require('../controllers/RecommendationController');
const { verifyAnySession, verifyBuyerSession } = require('../middleware/authentication');

// Get personalized recommendations for authenticated user
router.get('/', verifyBuyerSession, RecommendationController.getRecommendations);

// Get AI-style recommendations based on search query
router.get('/search', RecommendationController.getSearchRecommendations);

// Get similar products for a specific product
router.get('/similar/:productId', RecommendationController.getSimilarProducts);

// Get popular products
router.get('/popular', RecommendationController.getPopularProducts);

// Track product view (for analytics)
router.post('/track-view/:productId', RecommendationController.trackProductView);

module.exports = router;
