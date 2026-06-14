const express = require('express'); // Import the Express framework to create a router for handling category-related routes
const router = express.Router(); // Create a new Express router to handle category-related routes
const CategoryController = require('../controllers/CategoryController'); // Import the CategoryController to handle category-related operations
const { verifyAdminSession } = require('../middleware/authentication'); // Middleware to verify that the user has an active admin session, ensuring that only authorized users can access protected routes
const { checkPermission } = require('../middleware/authorization'); //
const upload = require('../middleware/upload');

// Get all categories (public)
router.get('/', CategoryController.list);

// Get all categories with product counts (public)
router.get('/counts/all', CategoryController.getAllWithProductCounts);

// Get category count (public)
// This endpoint provides a simple count of all categories in the system. It's useful for analytics, dashboard displays, or any feature that needs to know how many categories exist without fetching the full list of categories and their details. By keeping this endpoint public, we allow both admin and regular users to access this information without requiring authentication, which can be beneficial for performance and user experience in certain contexts.
router.get('/count', CategoryController.getCount);

// Get category with its products (public)
// This endpoint retrieves a specific category along with all the products that belong to it. It's designed to provide a comprehensive view of a category and its associated products in a single request. By making this endpoint public, we allow both admin and regular users to access detailed information about categories and their products without needing authentication, which can enhance user experience and accessibility of category data.
router.get('/:id/with-products', CategoryController.getWithProducts);

// Get single category (public)
// This endpoint allows anyone to retrieve details of a specific category by its ID. It's useful for displaying category information on the frontend, such as in category listings or product pages, without requiring users to log in. By keeping this endpoint public, we ensure that category information is easily accessible to all users, which can improve user experience and engagement with the site.
router.get('/:id', CategoryController.getOne);

// Protected routes - require authentication
// Create new category
// This endpoint allows admin users to create a new category. It requires authentication and the 'manage_categories' permission to ensure that only authorized users can create categories, which helps maintain the integrity and organization of the product catalog.
router.post('/', verifyAdminSession, checkPermission('manage_categories'), upload.single('icon'), CategoryController.create);

// Update category
// This endpoint allows admin users to update an existing category by its ID. It requires authentication and the 'manage_categories' permission to ensure that only authorized users can modify category information, which helps maintain the integrity and organization of the product catalog.
router.put('/:id', verifyAdminSession, checkPermission('manage_categories'), upload.single('icon'), CategoryController.update);

// Delete category
// This endpoint allows admin users to delete a category by its ID. It requires authentication and the 'manage_categories' permission to ensure that only authorized users can remove categories, which helps maintain the integrity and organization of the product catalog. Deleting a category may also involve handling related products, so it's important to restrict this action to prevent accidental data loss.
router.delete('/:id', verifyAdminSession, checkPermission('manage_categories'), CategoryController.delete);

// Note: The getCount and getAllWithProductCounts endpoints are intentionally left public to allow both admin and regular users to access category counts without authentication, as this information is often needed for analytics, dashboards, or frontend displays without requiring user login.
module.exports = router;

