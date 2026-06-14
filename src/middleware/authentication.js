const SessionManager = require('../services/SessionManager');

function verifyAdminSession(req, res, next) {
  // Check if admin session exists
  if (req.session && req.session.isAdmin) {
    console.log('[Auth] Admin session validated successfully for user:', req.session.username);
    req.adminToken = 'session-based'; // For backward compatibility
    return next();
  }

  // Try to validate token from Authorization header, x-admin-token header, or cookie
  const bearer = req.headers.authorization?.split(' ')[1];
  const headerToken = req.headers['x-admin-token'];
  const cookieToken = req.cookies?.adminToken;
  console.log('[Auth] verifyAdminSession received:', {
    hasAuthorization: !!bearer,
    hasXAdminToken: !!headerToken,
    hasCookieToken: !!cookieToken,
    cookieValue: cookieToken ? cookieToken.substring(0, 15) + '...' : null
  });

  const token = bearer || headerToken || cookieToken;
  if (token) {
    console.log('[Auth] verifyAdminSession using token source:', bearer ? 'Authorization' : headerToken ? 'x-admin-token' : 'cookie');
    const session = SessionManager.validate(token);
    if (session && session.username) {
      console.log('[Auth] Admin token validated successfully for user:', session.username);
      req.adminToken = token;
      req.session = req.session || {};
      req.session.userId = session.id;
      req.session.username = session.username;
      req.session.isAdmin = true;
      return next();
    }
  }

  console.warn('[Auth] No valid admin session or token found');
  return res.status(401).json({ error: 'Unauthorized. Please login as admin.' });
}

function verifyUserSession(req, res, next) {
  // Check if user session exists
  if (req.session && req.session.isUser) {
    console.log('[UserAuth] User session validated successfully for user:', req.session.username);
    req.userToken = 'session-based'; // For backward compatibility
    return next();
  }

  // Try to validate token from Authorization header
  const bearer = req.headers.authorization?.split(' ')[1];
  const token = bearer || req.headers['x-user-token'];
  
  if (token) {
    const session = SessionManager.validate(token);
    if (session && session.username) {
      console.log('[UserAuth] User token validated successfully for user:', session.username);
      req.userToken = token;
      req.session = req.session || {};
      req.session.userId = session.id;
      req.session.username = session.username;
      req.session.isUser = true;
      return next();
    }
  }

  console.warn('[UserAuth] No valid user session or token found');
  return res.status(401).json({ error: 'Unauthorized. Please login as user.' });
}

function verifyAnySession(req, res, next) {
  // Check if any session exists (admin or user)
  if (req.session && (req.session.isAdmin || req.session.isUser)) {
    console.log('[AnyAuth] Session validated successfully for user:', req.session.username);
    req.token = 'session-based'; // For backward compatibility
    return next();
  }

  // Try to validate token from Authorization header
  const bearer = req.headers.authorization?.split(' ')[1];
  const token = bearer || req.headers['x-user-token'] || req.headers['x-admin-token'] || req.cookies?.userToken || req.cookies?.adminToken;
  
  if (token) {
    const session = SessionManager.validate(token);
    if (session && session.username) {
      console.log('[AnyAuth] Token validated successfully for user:', session.username);
      req.token = token;
      req.session = req.session || {};
      req.session.userId = session.id;
      req.session.username = session.username;
      req.session.isUser = true; // Set as user by default, can be overridden
      return next();
    }
  }

  console.warn('[AnyAuth] No valid session or token found');
  return res.status(401).json({ error: 'Unauthorized. Please login.' });
}

function verifyBuyerSession(req, res, next) {
  // Check if user session exists (buyers are users)
  if (req.session && req.session.isUser) {
    console.log('[BuyerAuth] Buyer session validated successfully for user:', req.session.username);
    req.buyerToken = 'session-based'; // For backward compatibility
    // Keep compatibility with controllers expecting userId
    req.session.buyerId = req.session.userId;
    return next();
  }

  // Try to validate token from Authorization header
  const bearer = req.headers.authorization?.split(' ')[1];
  const token = bearer || req.headers['x-user-token'];
  
  if (token) {
    const session = SessionManager.validate(token);
    if (session && session.username) {
      console.log('[BuyerAuth] Buyer token validated successfully for user:', session.username);
      req.buyerToken = token;
      req.session = req.session || {};
      req.session.userId = session.id;
      req.session.username = session.username;
      req.session.isUser = true;
      req.session.buyerId = session.id; // Keep compatibility with controllers expecting buyerId
      return next();
    }
  }

  console.warn('[BuyerAuth] No valid buyer session or token found');
  return res.status(401).json({ error: 'Unauthorized. Please login.' });
}

module.exports = { verifyAdminSession, verifyUserSession, verifyAnySession, verifyBuyerSession };
