const crypto = require('crypto');
const Admin = require('../models/Admin');
const SessionManager = require('../services/SessionManager');
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const Category = require('../models/Category');
const Analytics = require('../models/Analytics');
const Expense = require('../models/Expense');

class AdminController {
  static async login(req, res, next) {
    try {
      const { username, password } = req.body;
      
      console.log(`[AdminController.login] Login attempt for user: ${username}`);
      
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
      }

      // Authenticate admin user against users table
      const admin = await Admin.authenticate(username, password);
      
      if (!admin) {
        console.warn(`[AdminController.login] Login failed for user: ${username}`);
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      }

      // Create a new admin session token for API access
      const token = crypto.randomBytes(24).toString('hex');
      SessionManager.create(token, admin.username, admin.id);

      // Store admin session data for cookie-based access as well
      req.session.adminId = admin.id;
      req.session.username = admin.username;
      req.session.email = admin.email;
      req.session.role = admin.role_name;
      req.session.isAdmin = true;
      
      console.log(`[AdminController.login] ✅ Login successful for user: ${username}`);
      res.cookie('adminToken', token, {
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        httpOnly: false
      });
      res.json({ 
        success: true,
        token,
        accessToken: token,
        user: { 
          id: admin.id, 
          username: admin.username, 
          email: admin.email, 
          role: admin.role_name 
        } 
      });
    } catch (err) {
      console.error(`[AdminController.login] Error during login:`, err);
      next(err);
    }
  }

  static async logout(req, res, next) {
    try {
      req.session.destroy((err) => {
        if (err) {
          console.error('[AdminController.logout] Error destroying session:', err);
          return next(err);
        }
        console.log(`[AdminController] Logout successful`);
        res.json({ success: true });
      });
    } catch (err) {
      next(err);
    }
  }

  static async getDashboardStats(req, res, next) {
    try {
      console.log('[AdminController.getDashboardStats] Fetching dashboard statistics...');
      
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      // Fetch all required statistics in parallel
      const [totalSales, totalOrders, totalProducts, totalUsers, totalCollections, averageTimeMinutes, totalConnections, analyticsSummary, profitLoss] = await Promise.all([
        Order.getTotalSales(),
        Order.count(),
        Product.count(),
        User.count(),
        Category.count(),
        Order.getAverageOrderDurationMinutes(),
        Order.getTotalOrderItemsCount(),
        Analytics.getSummary({ startDate, endDate }),
        Expense.getProfitLoss({ startDate, endDate })
      ]);

      const uniqueVisitors = analyticsSummary?.uniqueVisitors ?? 0;
      const bounceRate = analyticsSummary?.bounceRate ?? 0;
      const userRegistrations = parseInt(totalUsers) || 0;
      const newOrders = parseInt(totalOrders) || 0;

      console.log('[AdminController.getDashboardStats] Stats retrieved:', {
        totalSales,
        totalOrders,
        totalProducts,
        totalUsers,
        totalCollections,
        averageTimeMinutes,
        totalConnections,
        uniqueVisitors,
        bounceRate,
        profitLoss
      });

      res.json({
        success: true,
        data: {
          totalSales: parseFloat(totalSales) || 0,
          totalOrders: newOrders,
          totalProducts: parseInt(totalProducts) || 0,
          totalCustomers: parseInt(totalUsers) || 0,
          totalUsers: userRegistrations,
          totalCollections: parseInt(totalCollections) || 0,
          averageTime: typeof averageTimeMinutes === 'number' ? Number(averageTimeMinutes.toFixed(2)) : 0,
          totalConnections: parseInt(totalConnections) || 0,
          totalMales: 0,
          totalFemales: 0,
          newOrders,
          bounceRate,
          userRegistrations,
          uniqueVisitors,
          totalExpenses: profitLoss.total_expenses,
          profit: profitLoss.profit,
          profitMargin: profitLoss.profit_margin
        }
      });
    } catch (err) {
      console.error('[AdminController.getDashboardStats] Error:', err);
      next(err);
    }
  }

  static async getOrdersStatistics(req, res, next) {
    try {
      console.log('[AdminController.getOrdersStatistics] Fetching orders statistics...');
      
      // Fetch all orders statistics in parallel
      const [ordersByStatus, ordersByPayment, ordersTrend] = await Promise.all([
        Order.getOrdersByShippingStatus(),
        Order.getOrdersByPaymentStatus(),
        Order.getOrdersTrendLast7Days()
      ]);
      
      console.log('[AdminController.getOrdersStatistics] Statistics retrieved successfully');
      
      res.json({
        success: true,
        data: {
          ordersByStatus,
          ordersByPayment,
          ordersTrend
        }
      });
    } catch (err) {
      console.error('[AdminController.getOrdersStatistics] Error:', err);
      next(err);
    }
  }

  static async getConsumers(req, res, next) {
    try {
      console.log('[AdminController.getConsumers] Fetching consumers (buyers) list...');
      const buyers = await User.getAllBuyers();
      console.log('[AdminController.getConsumers] Retrieved', buyers.length, 'buyers');
      res.json({ success: true, data: buyers });
    } catch (err) {
      console.error('[AdminController.getConsumers] Error:', err);
      next(err);
    }
  }

  static async getSettings(req, res, next) {
    try {
      const SystemSettings = require('../models/SystemSettings');
      const settings = await SystemSettings.getAll();
      res.json({ success: true, data: settings });
    } catch (err) {
      console.error('[AdminController.getSettings] Error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async updateSettings(req, res, next) {
    try {
      const SystemSettings = require('../models/SystemSettings');
      const payload = req.body || {};
      const updated = await SystemSettings.upsert(payload);
      res.json({ success: true, data: updated });
    } catch (err) {
      console.error('[AdminController.updateSettings] Error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async uploadLogo(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }
      // Build public URL path for uploaded file
      const fileName = req.file.filename;
      const url = `/uploads/${fileName}`;

      const SystemSettings = require('../models/SystemSettings');
      await SystemSettings.upsert({ siteLogo: url });

      res.json({ success: true, url });
    } catch (err) {
      console.error('[AdminController.uploadLogo] Error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = AdminController;
