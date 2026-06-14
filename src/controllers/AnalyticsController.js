const Analytics = require('../models/Analytics');
const crypto = require('crypto');

function generateRandomId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return crypto.randomBytes(16).toString('hex');
}

class AnalyticsController {
  static async recordPageView(req, res) {
    try {
      const { url, referrer, title, userAgent, metadata } = req.body || {};
      let visitorId = req.cookies?.analytics_visitor_id;
      let sessionId = req.cookies?.analytics_session_id;

      if (!visitorId) {
        visitorId = generateRandomId();
      }
      if (!sessionId) {
        sessionId = generateRandomId();
      }

      const result = await Analytics.createPageView({
        visitorId,
        sessionId,
        url: url || req.originalUrl || '/',
        referrer: referrer || req.get('Referrer') || '',
        title: title || '',
        userAgent: userAgent || req.get('User-Agent') || '',
        ipAddress: req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || '',
        metadata: metadata || null
      });

      const secure = process.env.NODE_ENV === 'production';
      const cookieOptions = {
        maxAge: 365 * 24 * 60 * 60 * 1000,
        httpOnly: false,
        sameSite: 'lax',
        secure
      };

      res.cookie('analytics_visitor_id', result.visitorId, cookieOptions);
      res.cookie('analytics_session_id', result.sessionId, {
        ...cookieOptions,
        maxAge: 30 * 60 * 1000
      });

      res.json({ success: true, data: result });
    } catch (err) {
      console.error('[AnalyticsController.recordPageView] Error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getAnalyticsSummary(req, res) {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
      const summary = await Analytics.getSummary({ startDate, endDate });
      res.json({ success: true, data: summary });
    } catch (err) {
      console.error('[AnalyticsController.getAnalyticsSummary] Error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = AnalyticsController;
