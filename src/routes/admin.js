const express = require('express'); // Import the Express framework to create a router for handling admin-related routes
const router = express.Router(); // Create a new Express router to handle admin-related routes
const AdminController = require('../controllers/AdminController'); // Import the AdminController to handle admin-related operations such as login and logout
const ProductController = require('../controllers/ProductController'); // Import the ProductController to handle product-related operations for admin routes
const CouponController = require('../controllers/CouponController'); // Import the CouponController to handle coupon-related operations for admin routes
const OrderController = require('../controllers/OrderController'); // Import the OrderController to handle order-related operations for admin routes
const ReportController = require('../controllers/ReportController'); // Import the ReportController to handle reporting and export endpoints
const User = require('../models/User');
const { verifyAdminSession } = require('../middleware/authentication'); // Middleware to verify that the user has an active admin session, ensuring that only authorized users can access protected admin routes
const { checkPermission } = require('../middleware/authorization');
const path = require('path');
const multer = require('multer');

// Configure multer storage for admin uploads (public/uploads)
const uploadsDir = path.join(__dirname, '../..', 'public', 'uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const safeName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;
    cb(null, safeName);
  }
});
const upload = multer({ storage });

// Admin routes - mounted at /api/admin in app.js
// Login routes - accessible to all users
// This route allows admin users to log in by providing their credentials. It does not require an active session, as it's the entry point for authentication. The AdminController.login method will handle the authentication logic, including verifying credentials and creating a session if the login is successful.
router.post('/login', AdminController.login);  // Also mounted at /api/login for public access
// Logout route - requires active admin session
// This route allows admin users to log out by destroying their active session. It requires an active admin session to ensure that only authenticated admin users can log out, which helps maintain security and proper session management. The AdminController.logout method will handle the logic for destroying the session and invalidating the token.
router.post('/logout', verifyAdminSession, AdminController.logout);
// Token validation route - requires active admin session
// This route allows admin users to validate their session. It requires an active admin session to ensure that only authenticated admin users can access this endpoint.
router.get('/validate', verifyAdminSession, (req, res) => {
  // Session validation endpoint - returns 200 if session is valid
  res.json({
    success: true,
    message: 'Session is valid',
    session: {
      username: req.session.username,
      role: req.session.role,
      email: req.session.email
    }
  });
});

// Debug endpoint to check session status (for troubleshooting)
router.get('/debug/sessions', verifyAdminSession, (req, res) => {
  // This endpoint is intended for debugging purposes only and should not be exposed in production environments.
  res.json({
    timestamp: new Date().toISOString(),
    currentSession: {
      username: req.session.username,
      role: req.session.role,
      email: req.session.email,
      isAdmin: req.session.isAdmin
    },
    message: 'Session debug information'
  });
});

// Simple status endpoint
router.get('/status', (req, res) => {
  res.json({
    serverStatus: 'OK',
    timestamp: new Date().toISOString(),
    message: 'Admin API is operational'
  });
});

// Dashboard statistics endpoint (requires admin session)
// This endpoint retrieves aggregated statistics for the admin dashboard including total sales, orders, products, and customers
router.get('/dashboard/stats', verifyAdminSession, AdminController.getDashboardStats);

// Orders statistics endpoint (requires admin session)
// This endpoint retrieves detailed orders statistics including orders by status, payment status, and trend data
router.get('/orders/statistics', verifyAdminSession, AdminController.getOrdersStatistics);

// Reports endpoints (requires admin session)
router.get('/reports', verifyAdminSession, ReportController.getReports);
router.get('/reports/export', verifyAdminSession, ReportController.exportReport);
router.post('/reports/schedule', verifyAdminSession, ReportController.scheduleReport);
router.get('/reports/schedules', verifyAdminSession, ReportController.listScheduledReports);

// Consumers endpoint (requires admin session)
// This endpoint retrieves all buyer accounts for the admin consumer page
router.get('/consumers', verifyAdminSession, AdminController.getConsumers);

// Consumer actions (requires admin session)
router.patch('/consumers/:id/deactivate', verifyAdminSession, async (req, res) => {
  try {
    const user = await User.getById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Consumer not found' });
    }

    const updated = await User.update(req.params.id, { active: false });
    return res.json({ success: true, data: updated, message: 'Consumer deactivated successfully' });
  } catch (err) {
    console.error('[AdminRoutes.deactivateConsumer] Error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to deactivate consumer' });
  }
});

router.patch('/consumers/:id/activate', verifyAdminSession, async (req, res) => {
  try {
    const user = await User.getById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Consumer not found' });
    }

    const updated = await User.update(req.params.id, { active: true });
    return res.json({ success: true, data: updated, message: 'Consumer activated successfully' });
  } catch (err) {
    console.error('[AdminRoutes.activateConsumer] Error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to activate consumer' });
  }
});

// Example protected route to get all products (requires admin session)
// This endpoint allows admin users to retrieve a list of all products in the system. It requires an active admin session to ensure that only authorized users can access this information, which helps maintain security and control over product data. The ProductController.list method will handle the logic for fetching and returning the product data, which can be used for managing products in the admin dashboard or for other administrative purposes.
router.get('/products', verifyAdminSession, ProductController.list);
router.get('/orders', verifyAdminSession, OrderController.listOrdersAdmin);

// Coupon management routes (requires admin session)
router.get('/coupons', verifyAdminSession, CouponController.getAllCoupons);
router.get('/coupons/:id', verifyAdminSession, CouponController.getCouponById);
router.post('/coupons', verifyAdminSession, CouponController.createCoupon);
router.put('/coupons/:id', verifyAdminSession, CouponController.updateCoupon);
router.delete('/coupons/:id', verifyAdminSession, CouponController.deleteCoupon);

// Discount notification route (requires admin session)
router.post('/send-discount-notification', verifyAdminSession, async (req, res) => {
  try {
    const { title, description, discountCode, discountPercent, validUntil, categories, targetEmails } = req.body;

    // Validate required fields
    if (!title || !description || !discountCode || !discountPercent || !validUntil) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: title, description, discountCode, discountPercent, validUntil'
      });
    }

    const EmailService = require('../services/EmailService');
    const User = require('../models/User');

    // Prepare discount data
    const discount = {
      title,
      description,
      discountCode,
      discountPercent: parseFloat(discountPercent),
      validUntil,
      categories: categories || []
    };

    let recipients = [];
    let results = { sent: 0, failed: 0, errors: [] };

    if (targetEmails && Array.isArray(targetEmails)) {
      // Send to specific emails
      recipients = targetEmails;
    } else {
      // Send to all buyers (users with role 'buyer' or no specific role)
      const buyers = await User.getAllBuyers();
      recipients = buyers.map(buyer => buyer.email).filter(email => email);
    }

    console.log(`Sending discount notification to ${recipients.length} recipients...`);

    // Send emails (with rate limiting to avoid overwhelming the SMTP server)
    for (const email of recipients) {
      try {
        await EmailService.sendDiscountNotificationEmail(email, discount);
        results.sent++;
        console.log(`✅ Sent discount notification to: ${email}`);
      } catch (error) {
        results.failed++;
        results.errors.push({ email, error: error.message });
        console.error(`❌ Failed to send to ${email}:`, error.message);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    res.json({
      success: true,
      message: `Discount notification sent to ${results.sent} recipients${results.failed > 0 ? `, ${results.failed} failed` : ''}`,
      results
    });

  } catch (error) {
    console.error('Error sending discount notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send discount notifications',
      error: error.message
    });
  }
});

// Analytics endpoints (requires admin session)
router.get('/analytics/events', verifyAdminSession, async (req, res) => {
  try {
    const Analytics = require('../models/Analytics');
    const filters = {
      startDate: req.query.startDate ? new Date(req.query.startDate) : null,
      endDate: req.query.endDate ? new Date(req.query.endDate) : null,
      limit: req.query.limit ? parseInt(req.query.limit) : 100,
      offset: req.query.offset ? parseInt(req.query.offset) : 0
    };

    // Get analytics events from database
    const events = await Analytics.getEvents(filters);
    const total = await Analytics.getEventsCount(filters);

    res.json({
      success: true,
      data: events,
      pagination: {
        total,
        limit: filters.limit,
        offset: filters.offset,
        hasMore: (filters.offset + filters.limit) < total
      }
    });
  } catch (err) {
    console.error('[AdminController.getAnalyticsEvents] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/analytics/summary', verifyAdminSession, async (req, res) => {
  try {
    const Analytics = require('../models/Analytics');
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

    const summary = await Analytics.getSummary({ startDate, endDate });
    res.json({ success: true, data: summary });
  } catch (err) {
    console.error('[AdminController.getAnalyticsSummary] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// System settings (requires admin session + system_settings permission)
router.get('/settings', verifyAdminSession, checkPermission('system_settings'), AdminController.getSettings);
router.put('/settings', verifyAdminSession, checkPermission('system_settings'), AdminController.updateSettings);

// Logo upload - saves file to public/uploads and updates system settings with `siteLogo` URL
router.post('/settings/logo', verifyAdminSession, checkPermission('system_settings'), upload.single('logo'), AdminController.uploadLogo);

module.exports = router;
