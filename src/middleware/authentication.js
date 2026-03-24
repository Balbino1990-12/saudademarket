const SessionManager = require('../services/SessionManager');

function verifyAdminSession(req, res, next) {
  let token = null;

  // Try to get token from different sources (in order of priority)
  
  // 1. Check Authorization header with Bearer format
  if (req.headers.authorization) {
    const authHeader = req.headers.authorization;
    console.log('[Auth] Authorization header found:', authHeader.substring(0, 20) + '...');
    
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
      console.log('[Auth] Extracted Bearer token:', token.substring(0, 10) + '...');
    }
  }

  // 2. Check x-admin-token header
  if (!token && req.headers['x-admin-token']) {
    token = req.headers['x-admin-token'].trim();
    console.log('[Auth] Using x-admin-token:', token.substring(0, 10) + '...');
  }

  // 3. Check cookies
  if (!token && req.cookies?.adminToken) {
    token = req.cookies.adminToken.trim();
    console.log('[Auth] Using cookie adminToken:', token.substring(0, 10) + '...');
  }

  console.log('[Auth] Final token to validate:', token ? token.substring(0, 10) + '...' : 'NONE');
  console.log('[Auth] Active sessions on server:', SessionManager.getActiveCount());

  // Validate token using SessionManager
  if (!token) {
    console.warn('[Auth] No token found in any source');
    return res.status(401).json({ error: 'Unauthorized. No token provided.' });
  }

  const sessionData = SessionManager.validate(token);
  if (!sessionData) {
    console.warn('[Auth] Token validation failed for token:', token.substring(0, 10) + '...');
    return res.status(401).json({ error: 'Unauthorized. Please login.' });
  }

  console.log('[Auth] Token validated successfully');
  req.adminToken = token;
  req.session = req.session || {};
  req.session.adminUsername = sessionData.username;
  next();
}

function verifyUserSession(req, res, next) {
  let token = null;

  // Try to get token from different sources (in order of priority)
  
  // 1. Check Authorization header with Bearer format
  if (req.headers.authorization) {
    const authHeader = req.headers.authorization;
    console.log('[UserAuth] Authorization header found:', authHeader.substring(0, 20) + '...');
    
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
      console.log('[UserAuth] Extracted Bearer token:', token.substring(0, 10) + '...');
    }
  }

  // 2. Check x-user-token header
  if (!token && req.headers['x-user-token']) {
    token = req.headers['x-user-token'].trim();
    console.log('[UserAuth] Using x-user-token:', token.substring(0, 10) + '...');
  }

  // 3. Check cookies
  if (!token && req.cookies?.userToken) {
    token = req.cookies.userToken.trim();
    console.log('[UserAuth] Using cookie userToken:', token.substring(0, 10) + '...');
  }

  console.log('[UserAuth] Final token to validate:', token ? token.substring(0, 10) + '...' : 'NONE');
  console.log('[UserAuth] Active sessions on server:', SessionManager.getActiveCount());

  // Validate token using SessionManager
  if (!token) {
    console.warn('[UserAuth] No token found in any source');
    return res.status(401).json({ error: 'Unauthorized. No token provided.' });
  }

  const sessionData = SessionManager.validate(token);
  if (!sessionData) {
    console.warn('[UserAuth] Token validation failed for token:', token.substring(0, 10) + '...');
    return res.status(401).json({ error: 'Unauthorized. Please login.' });
  }

  console.log('[UserAuth] Token validated successfully for user:', sessionData.username);
  req.userToken = token;
  req.session = req.session || {};
  req.session.username = sessionData.username;
  next();
}

function verifyAnySession(req, res, next) {
  let token = null;

  // Try to get token from Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.substring(7).trim();
  }

  // Try x-admin-token or x-user-token header
  if (!token && req.headers['x-admin-token']) {
    token = req.headers['x-admin-token'].trim();
  }
  if (!token && req.headers['x-user-token']) {
    token = req.headers['x-user-token'].trim();
  }

  // Try cookies
  if (!token && req.cookies?.adminToken) {
    token = req.cookies.adminToken.trim();
  }
  if (!token && req.cookies?.userToken) {
    token = req.cookies.userToken.trim();
  }

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized. No token provided.' });
  }

  const sessionData = SessionManager.validate(token);
  if (!sessionData) {
    return res.status(401).json({ error: 'Unauthorized. Please login.' });
  }

  req.session = req.session || {};
  req.session.username = sessionData.username;
  req.token = token;
  next();
}

function verifyBuyerSession(req, res, next) {
  let token = null;

  // 1. Check Authorization header with Bearer format
  if (req.headers.authorization) {
    const authHeader = req.headers.authorization;
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }
  }

  // 2. Check x-buyer-token header
  if (!token && req.headers['x-buyer-token']) {
    token = req.headers['x-buyer-token'].trim();
  }

  // 3. Check cookies
  if (!token && req.cookies?.buyerToken) {
    token = req.cookies.buyerToken.trim();
  }

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized. No token provided.' });
  }

  const sessionData = SessionManager.validate(token);
  if (!sessionData) {
    return res.status(401).json({ error: 'Unauthorized. Please login.' });
  }

  req.buyerToken = token;
  req.session = req.session || {};
  req.session.buyerId = sessionData.id;
  next();
}

module.exports = { verifyAdminSession, verifyUserSession, verifyAnySession, verifyBuyerSession };