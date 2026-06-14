const express = require('express'); // Import the Express framework to create a router for handling specialty-related routes
const router = express.Router(); // Create a new Express router to handle specialty-related routes
const SpecialtiesController = require('../controllers/SpecialtiesController');

/**
 * Public routes - available to everyone
 */

// Get all specialties
router.get('/', SpecialtiesController.getAll);

// Get all categories
router.get('/categories/all', SpecialtiesController.getCategories);

// Get specialties by category
router.get('/category/:category', SpecialtiesController.getByCategory);

// Get products assigned to a specialty
router.get('/:id/products', SpecialtiesController.getProducts);

// Get specialty by ID
router.get('/:id', SpecialtiesController.getById);

/**
 * Admin routes - would require authentication middleware
 */

// Create specialty
router.post('/', SpecialtiesController.create);

// Update specialty
router.put('/:id', SpecialtiesController.update);

// Delete specialty
router.delete('/:id', SpecialtiesController.delete);

module.exports = router;

