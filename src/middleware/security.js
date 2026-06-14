/**
 * Security Middleware
 * Implements helmet.js, rate limiting, and input sanitization
 */

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const { body, validationResult } = require('express-validator');
const csrf = require('csurf');

/**
 * Helmet security headers
 */
const cspDirectives = {
  defaultSrc: ["'self'", 'https:'],
  scriptSrc: ["'self'", "'unsafe-inline'", 'https:', 'blob:'],
  styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
  imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
  fontSrc: ["'self'", 'data:', 'https:'],
  connectSrc: ["'self'", 'https:', 'http://localhost:*'],
  frameSrc: ["'self'", 'https://js.stripe.com', 'https://hooks.stripe.com'],
  objectSrc: ["'none'"],
};

const helmetConfig = helmet({
  contentSecurityPolicy: false, // Disable helmet's default CSP, we'll set it manually
  frameguard: {
    action: 'deny'
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  }
});

/**
 * Custom CSP middleware to set directives with conditional upgradeInsecureRequests
 */
const cspMiddleware = (req, res, next) => {
  const directives = { ...cspDirectives };

  // Add upgradeInsecureRequests only in production
  if (process.env.NODE_ENV === 'production') {
    directives.upgradeInsecureRequests = [];
  }

  const cspString = Object.entries(directives)
    .map(([key, values]) => `${key} ${Array.isArray(values) ? values.join(' ') : values}`)
    .join(';');
  res.setHeader('Content-Security-Policy', cspString);
  next();
};

/**
 * Global rate limiter - applies to all requests EXCEPT static files
 */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // 1000 requests in development, 100 in production
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for static files and assets
    return /\.(html|css|js|json|jpg|jpeg|png|gif|svg|ico|woff|woff2|ttf|eot)$/i.test(req.path) ||
           req.path.startsWith('/css/') ||
           req.path.startsWith('/js/') ||
           req.path.startsWith('/images/');
  }
});

/**
 * Strict rate limiter for authentication endpoints
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: 'Too many login attempts, please try again after 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false // Count successful requests too
});

/**
 * Strict rate limiter for registration endpoint
 */
const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 registration attempts per hour
  message: 'Too many accounts created from this IP, please try again after an hour.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false
});

/**
 * API rate limiter for general API endpoints
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 200 : 1000, // 1000 requests in development, 200 in production
  message: 'Too many API requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Data sanitization middleware
 * Prevents NoSQL injection and validates input
 */
const sanitize = (req, res, next) => {
  try {
    // Sanitize data against NoSQL injection
    if (req.body) {
      req.body = mongoSanitize().middleware(req.body);
    }

    // Basic XSS prevention - sanitize string fields
    if (req.body) {
      Object.keys(req.body).forEach(key => {
        if (typeof req.body[key] === 'string') {
          // Remove potentially dangerous HTML/script tags
          req.body[key] = req.body[key]
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<[^>]*>/g, '')
            .trim();
        }
      });
    }

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Input validation middleware for user registration
 */
const validateRegistration = [
  body('username')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Username must be between 2 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),

  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),

  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/)
    .withMessage('Password must contain at least one letter and one number'),

  body('confirm_password')
    .optional({ nullable: true })
    .custom((value, { req }) => {
      if (value !== undefined && value !== null && value !== '' && value !== req.body.password) {
        throw new Error('Password confirmation does not match password');
      }
      return true;
    }),

  body('first_name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),

  body('last_name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters'),

  body('phone_number')
    .optional()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid phone number'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().reduce((acc, error) => {
          acc[error.param] = error.msg;
          return acc;
        }, {})
      });
    }
    next();
  }
];

/**
 * CSRF Protection Middleware
 * Prevents Cross-Site Request Forgery attacks
 */
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
});

/**
 * Middleware to ensure CSRF token is available in res.locals
 */
const csrfTokenMiddleware = (req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
};

module.exports = {
  helmetConfig,
  cspMiddleware,
  globalLimiter,
  authLimiter,
  registrationLimiter,
  apiLimiter,
  sanitize,
  validateRegistration,
  csrfProtection,
  csrfTokenMiddleware
};
