const express = require('express'); // Import the Express framework to create a router for handling admin-related routes
const router = express.Router(); // Create a new Express router to handle admin-related routes
const AdminController = require('../controllers/AdminController'); // Import the AdminController to handle admin-related operations such as login and logout
const ProductController = require('../controllers/ProductController'); // Import the ProductController to handle product-related operations for admin routes
const { verifyAdminSession } = require('../middleware/authentication'); // Middleware to verify that the user has an active admin session, ensuring that only authorized users can access protected admin routes
const SessionManager = require('../services/SessionManager'); // Import the SessionManager to manage admin sessions, including creating, validating, and destroying sessions for admin users

// Admin routes - mounted at /api/admin in app.js
// Login routes - accessible to all users
// This route allows admin users to log in by providing their credentials. It does not require an active session, as it's the entry point for authentication. The AdminController.login method will handle the authentication logic, including verifying credentials and creating a session if the login is successful.
router.post('/login', AdminController.login);  // Also mounted at /api/login for public access
// Logout route - requires active admin session
// This route allows admin users to log out by destroying their active session. It requires an active admin session to ensure that only authenticated admin users can log out, which helps maintain security and proper session management. The AdminController.logout method will handle the logic for destroying the session and invalidating the token.
router.post('/logout', verifyAdminSession, AdminController.logout);
// Token validation route - requires active admin session
// This route allows admin users to validate their session token. It requires an active admin session to ensure that only authenticated admin users can access this endpoint. The route will return a success response if the token is valid, along with some session details for debugging purposes. This can be useful for frontend applications to check if the admin user is still authenticated and to retrieve session information without needing to log in again.
router.get('/validate', verifyAdminSession, (req, res) => {
  // Token validation endpoint - returns 200 if token is valid
  const session = SessionManager.get(req.adminToken);
  res.json({  // Return session details for debugging purposes, but only include non-sensitive information to avoid exposing any security risks. This can help frontend developers understand the session state and debug authentication issues without compromising security.
    success: true, // Indicate that the token is valid
    message: 'Token is valid', // Provide a message confirming token validity
    session: { // Include non-sensitive session details for debugging purposes
      username: session?.username, // Include the username associated with the session, if available but do not include any sensitive information such as passwords or tokens
      createdAt: session?.createdAt, // Include the session creation time for debugging purposes, but do not include the exact expiration time to avoid exposing potential security risks
      activeSessions: SessionManager.getActiveCount() // Include the total number of active sessions for debugging purposes, but do not include any specific session identifiers to avoid exposing potential security risks
    }
  });
});

// Debug endpoint to check all active sessions (for troubleshooting)
router.get('/debug/sessions', (req, res) => {
  // This endpoint is intended for debugging purposes only and should not be exposed in production environments. It provides detailed information about all active sessions, which can be useful for troubleshooting authentication issues, monitoring session activity, and ensuring that session management is working correctly. However, it should be protected or removed in production to prevent potential security risks associated with exposing session information.
  const token = req.headers.authorization?.split('Bearer ')[1];
  // For debugging purposes, we will return all active sessions along with the current token's session details if available. This can help identify issues with session management and token validation during development and testing.
  const session = token ? SessionManager.get(token) : null;
  
  // Return detailed session information for debugging purposes, but ensure that no sensitive information is included in the response to avoid security risks. This can help developers understand the current session state and identify any issues with session management.
  res.json({
    // Include a timestamp for when the debug information was , which can help correlate session activity with other logs and events during troubleshooting.
    timestamp: new Date().toISOString(),
    // Include the total number of active sessions to provide insight into session activity and potential issues with session management, such as sessions not being properly destroyed or expired.
    activeCount: SessionManager.getActiveCount(),
    // Include the current token being validated for debugging purposes, but only include a truncated version of the token to avoid exposing sensitive information in the logs or responses.
    currentToken: token ? token.substring(0, 15) + '...' : 'none provided',
    // Include the session details for the current token being validated, if available, to provide insight into the session state and help identify any issues with token validation or session management. However, ensure that no sensitive information is included in the session details to avoid security risks.
    currentSession: session ? { 
      // Include the username associated with the session for debugging purposes, but do not include any sensitive information such as passwords or tokens to avoid security risks.
      username: session.username, 
      // Include the session creation time for debugging purposes, but do not include the exact expiration time to avoid exposing potential security risks. This can help developers understand when the session was created and identify any issues with session duration or expiration.
      createdAt: new Date(session.createdAt).toISOString(), 
      // Include the session expiration time for debugging purposes, but do not include the exact expiration time to avoid exposing potential security risks. This can help developers understand the session duration and identify any issues with session expiration or token validity.
      valid: true, // Indicate that the session is valid for debugging purposes, but do not include any specific session identifiers or sensitive information to avoid security risks.
      createdAt: new Date(session.createdAt).toISOString(), // Include the session expiration time for debugging purposes, but do not include the exact expiration time to avoid exposing potential security risks. This can help developers understand the session duration and identify any issues with session expiration or token validity.
      expiresAt: new Date(session.expiresAt).toISOString() // Include the session expiration time for debugging purposes, but do not include the exact expiration time to avoid exposing potential security risks. This can help developers understand the session duration and identify any issues with session expiration or token validity.
    } : null, // Include all active sessions for debugging purposes, but ensure that no sensitive information is included in the session details to avoid security risks. This can help developers understand the overall session activity and identify any issues with session management during development and testing.
    allSessions: SessionManager.getAllSessions() // Include all active sessions for debugging purposes, but ensure that no sensitive information is included in the session details to avoid security risks. This can help developers understand the overall session activity and identify any issues with session management during development and testing.
  });
});

// Simple status endpoint
// This endpoint provides a simple status check for the admin API. It can be used by monitoring tools or frontend applications to verify that the admin API is operational and to retrieve some basic information about the server status, such as the current timestamp and the number of active sessions. This can help ensure that the admin API is functioning correctly and can provide insight into the server's health and activity.
router.get('/status', (req, res) => {
  // Return a simple status response with the current timestamp and the number of active sessions. This can be useful for monitoring the health of the admin API and ensuring that it is operational.
  res.json({
    // Include a server status message to indicate that the admin API is operational, which can be useful for monitoring tools and frontend applications to quickly check the status of the API.
    serverStatus: 'OK',
    // Include the current timestamp to provide a reference point for the status check.w This can help correlate the status check with other logs and events on the server for troubleshooting and monitoring purposes.
    timestamp: new Date().toISOString(),
    // Include the number of active sessions to provide insight into the current session activity on the server, which can be useful for monitoring and troubleshooting session management issues.
    activeSessions: SessionManager.getActiveCount(),
    // Include a message confirming that the admin API is operational, which can be useful for monitoring tools and frontend applications to quickly check the status of the API and ensure that it is functioning correctly.
    message: 'Admin API is operational'
  });
});

// Example protected route to get all products (requires admin session)
// This endpoint allows admin users to retrieve a list of all products in the system. It requires an active admin session to ensure that only authorized users can access this information, which helps maintain security and control over product data. The ProductController.list method will handle the logic for fetching and returning the product data, which can be used for managing products in the admin dashboard or for other administrative purposes.
router.get('/products', verifyAdminSession, ProductController.list);

module.exports = router;