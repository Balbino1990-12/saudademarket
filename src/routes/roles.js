const express = require('express'); // Import the Express framework to create a router for handling role-related routes
const RoleController = require('../controllers/RoleController'); // Import the RoleController to handle role-related operations such as listing roles, getting role details, creating, updating, and deleting roles. The RoleController will contain the business logic for managing roles in the system, including interactions with the database and any necessary validation or processing of role data.
const { verifyAdminSession } = require('../middleware/authentication'); // Middleware to verify that the user has an active admin session, ensuring that only authorized users can access protected routes related to role management. This middleware will check for a valid admin token in the request headers and allow access to the route if the token is valid, or return an error response if the token is missing or invalid.
const { checkPermission } = require('../middleware/authorization'); // Middleware to check if the authenticated user has the required permissions to perform certain actions related to role management. This middleware will verify that the user has the 'manage_roles' permission before allowing access to protected routes for creating, updating, or deleting roles. It ensures that only users with the appropriate permissions can modify role data, which helps maintain security and control over role management in the system.

// Create a new Express router to handle role-related routes
const router = express.Router();

/**
 * Public endpoints
 */
// Get all roles (public)
router.get('/', RoleController.list);
// Get role count (public)
router.get('/count', RoleController.getCount);
// Get single role (public)
router.get('/:id', RoleController.getOne);

/**
 * Protected endpoints (admin only)
 */
// Create new role
// This endpoint allows admin users to create a new role in the system. It requires authentication and the 'manage_roles' permission to ensure that only authorized users can create roles, which helps maintain security and control over role management. The RoleController.create method will handle the logic for creating a new role, including validating the input data and saving the new role to the database.
router.post('/', verifyAdminSession, checkPermission('manage_roles'), RoleController.create);
// Update role
// This endpoint allows admin users to update an existing role by its ID. It requires authentication and the 'manage_roles' permission to ensure that only authorized users can modify role information, which helps maintain security and control over role management. The RoleController.update method will handle the logic for updating the role, including validating the input data and saving the changes to the database.
router.put('/:id', verifyAdminSession, checkPermission('manage_roles'), RoleController.update);
// Delete role
// This endpoint allows admin users to delete an existing role by its ID. It requires authentication and the 'manage_roles' permission to ensure that only authorized users can remove roles, which helps maintain security and control over role management. The RoleController.delete method will handle the logic for deleting the role, including any necessary validation and database operations. Deleting a role may also involve handling related user assignments or permissions, so it's important to restrict this action to prevent accidental data loss or security issues.
router.delete('/:id', verifyAdminSession, checkPermission('manage_roles'), RoleController.delete);
// Note: The getCount endpoint is intentionally left public to allow both admin and regular users to access role counts without authentication, as this information is often needed for analytics, dashboards, or frontend displays without requiring user login.
module.exports = router;
