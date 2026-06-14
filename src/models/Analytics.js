const crypto = require('crypto');
const { pool } = require('../config/database');

class Analytics {
  static async createPageView({ visitorId, sessionId, url, referrer, title, userAgent, ipAddress, metadata = null }) {
    try {
      const eventVisitorId = visitorId || crypto.randomBytes(16).toString('hex');
      const eventSessionId = sessionId || crypto.randomBytes(16).toString('hex');
      const sql = `INSERT INTO analytics_events (event_type, visitor_id, session_id, url, referrer, title, user_agent, ip_address, metadata, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`;
      await pool.query(sql, [
        'page_view',
        eventVisitorId,
        eventSessionId,
        url,
        referrer,
        title,
        userAgent,
        ipAddress,
        metadata ? JSON.stringify(metadata) : null
      ]);

      console.log('[Analytics.createPageView] Saved page view', {
        visitorId: eventVisitorId,
        sessionId: eventSessionId,
        url,
        referrer
      });

      return { visitorId: eventVisitorId, sessionId: eventSessionId };
    } catch (err) {
      console.error('[Analytics.createPageView] Error:', err);
      throw err;
    }
  }

  static async getSummary({ startDate = null, endDate = null } = {}) {
    try {
      const conditions = ['event_type = ?'];
      const params = ['page_view'];

      if (startDate) {
        conditions.push('created_at >= ?');
        params.push(startDate);
      }
      if (endDate) {
        conditions.push('created_at <= ?');
        params.push(endDate);
      }

      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

      const summarySql = `
        SELECT
          COUNT(*) AS totalPageViews,
          COUNT(DISTINCT session_id) AS totalSessions,
          COUNT(DISTINCT visitor_id) AS uniqueVisitors
        FROM analytics_events
        ${where}
      `;
      const [summaryRows] = await pool.query(summarySql, params);
      const summary = summaryRows[0] || { totalPageViews: 0, totalSessions: 0, uniqueVisitors: 0 };

      const bounceSql = `
        SELECT COUNT(*) AS bounces FROM (
          SELECT session_id, COUNT(*) AS views
          FROM analytics_events
          ${where}
          GROUP BY session_id
          HAVING views = 1
        ) AS single_hit_sessions
      `;
      const [bounceRows] = await pool.query(bounceSql, params);
      const totalSessions = parseInt(summary.totalSessions, 10) || 0;
      const bounceCount = parseInt(bounceRows[0]?.bounces || 0, 10) || 0;
      const bounceRate = totalSessions > 0 ? Number(((bounceCount / totalSessions) * 100).toFixed(1)) : 0;
      const averagePageViewsPerSession = totalSessions > 0 ? Number(((summary.totalPageViews || 0) / totalSessions).toFixed(2)) : 0;

      return {
        totalPageViews: parseInt(summary.totalPageViews, 10) || 0,
        totalSessions,
        uniqueVisitors: parseInt(summary.uniqueVisitors, 10) || 0,
        bounceRate,
        averagePageViewsPerSession,
        bounceCount
      };
    } catch (err) {
      console.error('[Analytics.getSummary] Error:', err);
      throw err;
    }
  }

  static async getEvents(filters = {}) {
    try {
      let sql = `SELECT * FROM analytics_events WHERE 1=1`;
      const params = [];
      const conditions = [];

      if (filters.startDate) {
        conditions.push('created_at >= ?');
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        conditions.push('created_at <= ?');
        params.push(filters.endDate);
      }

      if (filters.eventType) {
        conditions.push('event_type = ?');
        params.push(filters.eventType);
      }

      if (conditions.length > 0) {
        sql += ' AND ' + conditions.join(' AND ');
      }

      sql += ' ORDER BY created_at DESC';

      if (filters.limit) {
        sql += ' LIMIT ?';
        params.push(filters.limit);
      }

      if (filters.offset) {
        sql += ' OFFSET ?';
        params.push(filters.offset);
      }

      const [rows] = await pool.query(sql, params);
      return rows.map(row => ({
        ...row,
        metadata: row.metadata ? JSON.parse(row.metadata) : null
      }));
    } catch (err) {
      console.error('[Analytics.getEvents] Error:', err);
      throw err;
    }
  }

  static async getEventsCount(filters = {}) {
    try {
      let sql = `SELECT COUNT(*) as total FROM analytics_events WHERE 1=1`;
      const params = [];
      const conditions = [];

      if (filters.startDate) {
        conditions.push('created_at >= ?');
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        conditions.push('created_at <= ?');
        params.push(filters.endDate);
      }

      if (filters.eventType) {
        conditions.push('event_type = ?');
        params.push(filters.eventType);
      }

      if (conditions.length > 0) {
        sql += ' AND ' + conditions.join(' AND ');
      }

      const [rows] = await pool.query(sql, params);
      return parseInt(rows[0]?.total || 0);
    } catch (err) {
      console.error('[Analytics.getEventsCount] Error:', err);
      throw err;
    }
  }
}

module.exports = Analytics;
