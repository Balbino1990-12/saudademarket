const express = require('express'); // Import the Express framework to create a router for handling user-related routes
const router = express.Router(); // Create a new Express router to handle user-related routes
const UserController = require('../controllers/UserController'); // Import the UserController to handle user-related operations such as listing users, getting user details, creating, updating, and deleting users. The UserController will contain the business logic for managing users in the system, including interactions with the database and any necessary validation or processing of user data.
const { verifyAdminSession } = require('../middleware/authentication'); //
const { checkPermission } = require('../middleware/authorization');


/**
 * Public endpoints
 */

// Buyer registration endpoint
router.post('/register', UserController.register);

// Get all users
router.get('/', UserController.list);

// Get single user by ID
router.get('/:id', UserController.getOne);

// Get user count
router.get('/count', UserController.getCount);

/**
 * Protected endpoints - require authentication
 */

// Create a new user
router.post('/', verifyAdminSession, checkPermission('manage_users'), UserController.create);

// Update a user
router.put('/:id', verifyAdminSession, checkPermission('manage_users'), UserController.update);

// Delete a user
router.delete('/:id', verifyAdminSession, checkPermission('manage_users'), UserController.delete);

module.exports = router;
