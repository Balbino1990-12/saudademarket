
/**
 * Main Express application for PortugalStore backend.
 * Configures middleware, routes, security, sessions, and static file serving.
 * @module app
 */
require('dotenv').config();

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const fs = require('fs');
const errorHandler = require('./middleware/errorHandler');
const { helmetConfig, cspMiddleware, globalLimiter, authLimiter, registrationLimiter, apiLimiter, sanitize, csrfProtection } = require('./middleware/security');
const { geocodeAddress, isPointAllowed } = require('./middleware/geofence');
const productRoutes = require('./routes/products');
const categoryRoutes = require('./routes/categories');
const userRoutes = require('./routes/users');
const roleRoutes = require('./routes/roles');
const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');
const shopifyRoutes = require('./routes/shopify');
const activitiesRoutes = require('./routes/activities');
const analyticsRoutes = require('./routes/analytics');
const specialtiesRoutes = require('./routes/specialties');
const cartRoutes = require('./routes/cart');
const buyerRoutes = require('./routes/buyer');
const orderRoutes = require('./routes/orders');
const checkoutRoutes = require('./routes/checkout');
const recommendationRoutes = require('./routes/recommendations');
const recommendationProductRoutes = require('./routes/recommendationProducts');
const commentRoutes = require('./routes/comments');
const chatRoutes = require('./routes/chat');
const couponRoutes = require('./routes/coupons');
const returnRoutes = require('./routes/returns');
const contactRoutes = require('./routes/contact');
const referralRoutes = require('./routes/referrals');
const expenseRoutes = require('./routes/expenses');
const Product = require('./models/Product');
const AdminController = require('./controllers/AdminController');
const UserController = require('./controllers/UserController');
const { initDatabase } = require('./config/database');


/**
 * The Express application instance.
 * @type {import('express').Express}
 */
const app = express();

/**
 * TRUST PROXY CONFIGURATION
 * Trust proxy for secure cookies behind load balancers/reverse proxies.
 */
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1); // Trust first proxy

  // Redirect HTTP requests to HTTPS when SSL termination happens at the proxy
  app.use((req, res, next) => {
    const proto = req.headers['x-forwarded-proto'];
    if (req.secure || proto === 'https') {
      return next();
    }

    return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
  });
} else {
  app.set('trust proxy', false); // Don't trust proxy in development
}

/**
 * SECURITY MIDDLEWARE
 * Applies helmet, CSP, rate limiting, and sanitization.
 */
app.use(helmetConfig);

// Apply custom CSP middleware (without upgradeInsecureRequests in development)
app.use(cspMiddleware);

// Apply global rate limiter to all routes
app.use(globalLimiter);

// Data sanitization middleware (prevent NoSQL injection and XSS)
app.use(sanitize);

/**
 * COMPRESSION MIDDLEWARE
 * Enables gzip compression for all responses.
 */
const compression = require('compression');
app.use(compression({
  level: 6, // Compression level (1-9, 6 is good balance)
  threshold: 1024, // Only compress responses larger than 1KB
  filter: (req, res) => {
    // Don't compress responses with this request header
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Use compression filter function
    return compression.filter(req, res);
  }
}));

/**
 * STATIC ASSET SERVING WITH CACHE HEADERS
 * Serves static files with appropriate cache headers for production and development.
 */
const staticOptions = {
  maxAge: process.env.NODE_ENV === 'production' ? '1y' : 0, // 1 year cache in production, no cache in dev
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    // Set cache-control headers based on file type
    if (process.env.NODE_ENV === 'production') {
      const ext = path.split('.').pop().toLowerCase();

      // Static assets that can be cached long-term
      if (['css', 'js', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'woff', 'woff2', 'ttf', 'eot'].includes(ext)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // 1 year
        res.setHeader('Vary', 'Accept-Encoding');
      }
      // HTML files should not be cached
      else if (['html', 'htm'].includes(ext)) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
      // Other files get shorter cache
      else {
        res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour
      }
    } else {
      // Development: no caching
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
};


/**
 * Product detail page route.
 * @route GET /product-detail.html?id=PRODUCT_ID
 * @param {string} id - Product identifier (query param)
 */
app.get('/product-detail.html', async (req, res, next) => {
  try {
    const id = req.query.id;
    if (!id) {
      return res.status(404).sendFile(path.join(__dirname, '../public/404.html'));
    }
    const product = await Product.getByIdentifier(id);
    if (!product) {
      return res.status(404).sendFile(path.join(__dirname, '../public/404.html'));
    }
    res.sendFile(path.join(__dirname, '../product-detail.html'));
  } catch (err) {
    next(err);
  }
});

app.use(express.static(path.join(__dirname, '../public'), staticOptions));

// Standard middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());

/**
 * SESSION CONFIGURATION
 * Configures express-session with Redis store when available, otherwise falls back to memory store.
 */
const session = require('express-session');
let RedisStore = null;
try {
  // Attempt to require connect-redis, but it's optional now that Redis support is rolled back
  const connectRedis = require('connect-redis');
  // connect-redis may export a function that accepts session; handle both shapes
  RedisStore = connectRedis && (connectRedis.RedisStore || connectRedis.default || connectRedis(session));
} catch (err) {
  RedisStore = null;
}

const { getRedisClient, isRedisConnected } = require('./config/redis');
const redisClient = getRedisClient();
let sessionStore;

/**
 * MULTER CONFIGURATION FOR FILE UPLOADS
 * Configures multer for image uploads with destination, file naming, and validation.
 */
const uploadDir = path.join(__dirname, '../public/uploads');

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('[Multer] Created uploads directory:', uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: specialty-{timestamp}-{random}.{ext}
    const ext = path.extname(file.originalname);
    const filename = `specialty-${Date.now()}-${Math.random().toString(36).substr(2, 9)}${ext}`;
    cb(null, filename);
  }
});

const uploadImageFilter = (req, file, cb) => {
  // Allow only image files
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'), false);
  }
};

const imageUpload = multer({
  storage,
  fileFilter: uploadImageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Use Redis store only when explicitly connected and the RedisStore is available
if (isRedisConnected() && RedisStore) {
  sessionStore = new RedisStore({
    client: redisClient,
    ttl: 24 * 60 * 60, // 24 hours in seconds
    prefix: 'session:',
    disableTTL: false,
    disableTouch: false
  });
  console.log('[Session] Using Redis session store');
} else {
  if (process.env.NODE_ENV === 'production') {
    console.warn('[Session] Redis not available; using in-memory session store.');
  } else {
    console.log('[Session] Using in-memory session store (development)');
  }
  sessionStore = new session.MemoryStore();
}

// Validate session secret
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret || sessionSecret === 'your-super-secret-session-key-change-in-production') {
  if (process.env.NODE_ENV === 'production') {
    console.error('[Session] CRITICAL: SESSION_SECRET not set or using default value in production!');
    console.error('[Session] This is a major security vulnerability.');
    process.exit(1);
  } else {
    console.warn('[Session] Using default session secret (development only)');
  }
}


/**
 * Express session middleware.
 * @see {@link https://www.npmjs.com/package/express-session}
 */
app.use(session({
  store: sessionStore,
  secret: sessionSecret || 'your-super-secret-session-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  rolling: true, // Reset expiration on activity
  cookie: {
    secure: process.env.NODE_ENV === 'production' && app.get('trust proxy'), // HTTPS only in production with proxy
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax', // Strict in production, lax in dev
    domain: process.env.COOKIE_DOMAIN || undefined // Set domain for cross-subdomain cookies if needed
  },
  name: 'portugalstore.sid' // Change default session name for security
}));

// CSRF token endpoint for client-side forms

/**
 * CSRF token endpoint for client-side forms.
 * @route GET /csrf-token
 */
app.get('/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Custom CSP header (complementary to helmet's CSP)

/**
 * Custom security headers middleware (complementary to helmet).
 */
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// initialize DB

/**
 * Initialize the database connection and set dbReady flag.
 */
console.log('Initializing database...');
initDatabase()
  .then(() => {
    console.log('✓ Database initialized successfully');
    // Signal that DB is ready
    app.locals.dbReady = true;
  })
  .catch(err => {
    console.error('✗ Database initialization failed:', err.message || err);
    console.error('Full error:', err);
    // Don't exit process, just log the error
    app.locals.dbReady = false;
  });


/**
 * API ROUTES
 * Registers all API endpoints and applies rate limiting where needed.
 */
app.use('/api/products', apiLimiter, productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/users', apiLimiter, userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/shopify', shopifyRoutes);
app.use('/api/activities', activitiesRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/specialties', imageUpload.single('image'), specialtiesRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/buyer', buyerRoutes);
app.use('/api/user', buyerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/checkouts', checkoutRoutes);
app.use('/api/recommendations', apiLimiter, recommendationRoutes);
app.use('/api/recommendation-products', apiLimiter, recommendationProductRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/chat', apiLimiter, chatRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/admin/expenses', expenseRoutes);

if (process.env.NODE_ENV !== 'production') {
  app.post('/dev/check-geofence', async (req, res) => {
    try {
      const { address, lat, lng } = req.body || {};
      let coords = { lat, lng };

      if ((!lat || !lng) && address) {
        coords = await geocodeAddress(address);
      }

      if (coords.lat == null || coords.lng == null) {
        return res.status(400).json({ error: 'Provide either lat/lng or address in the request body.' });
      }

      const allowed = isPointAllowed(coords.lat, coords.lng);
      return res.json({ allowed, coords, source: coords.source || 'direct', message: allowed ? 'Address is inside allowed zone' : 'Address is outside allowed zone' });
    } catch (err) {
      return res.status(500).json({ error: err.message || 'Geocode failed' });
    }
  });
}

app.get('/api/geofence/check', (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return res.status(400).json({ error: 'Provide valid lat and lng query parameters.' });
  }

  const allowed = isPointAllowed(lat, lng);
  return res.json({ allowed, coords: { lat, lng }, message: allowed ? 'Your position is inside allowed zone' : 'Your position is outside allowed zone' });
});


/**
 * Stripe publishable key endpoint for client-side Stripe integration.
 * @route GET /api/config/stripe
 */
app.get('/api/config/stripe', (req, res) => {
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY || '';
  if (!publishableKey) {
    return res.status(500).json({ error: 'Stripe publishable key is not configured. Please set STRIPE_PUBLISHABLE_KEY environment variable.' });
  }
  res.json({ publishableKey });
});

// Health check endpoint for load balancers

/**
 * Health check endpoint for load balancers.
 * @route GET /health
 */
app.get('/health', (req, res) => {
  const isHealthy = app.locals.dbReady !== false;
  if (isHealthy) {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected'
    });
  } else {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected'
    });
  }
});

// Public login endpoints - accessible to all users (not admin-only)
// Apply strict rate limiting and CSRF protection to login routes

/**
 * Public login endpoints (admin and user).
 * @route POST /api/login
 * @route POST /api/user/login
 */
app.post('/api/login', csrfProtection, authLimiter, AdminController.login);  // Admin login
app.post('/api/user/login', csrfProtection, authLimiter, UserController.login);  // User login

// Serve login pages
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, '../backend/admin/login.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, '../backend/admin/login.html')));
app.get('/admin/login', (req, res) => res.sendFile(path.join(__dirname, '../backend/admin/login.html')));
app.get('/admin/login.html', (req, res) => res.sendFile(path.join(__dirname, '../backend/admin/login.html')));
app.get('/admin/settings', (req, res) => res.sendFile(path.join(__dirname, '../backend/admin/settings.html')));
app.get('/admin/settings.html', (req, res) => res.sendFile(path.join(__dirname, '../backend/admin/settings.html')));
app.get('/admin/cusumers.html', (req, res) => res.redirect('/admin/consumers'));
app.get('/admin/customers.html', (req, res) => res.redirect('/admin/consumers'));
app.get('/admin/cusumers', (req, res) => res.redirect('/admin/consumers'));
app.get('/admin/customers', (req, res) => res.redirect('/admin/consumers'));

// User pages (with and without .html)
app.get('/user/login', (req, res) => res.sendFile(path.join(__dirname, '../backend/user/login.html')));
app.get('/user/login.html', (req, res) => res.sendFile(path.join(__dirname, '../backend/user/login.html')));
app.get('/user/register', (req, res) => res.sendFile(path.join(__dirname, '../backend/user/register.html')));
app.get('/user/register.html', (req, res) => res.sendFile(path.join(__dirname, '../backend/user/register.html')));
app.get('/user/dashboard', (req, res) => res.sendFile(path.join(__dirname, '../backend/user/dashboard.html')));
app.get('/user/dashboard.html', (req, res) => res.sendFile(path.join(__dirname, '../backend/user/dashboard.html')));

// Admin pages (with and without .html)
app.get('/admin/index', (req, res) => res.sendFile(path.join(__dirname, '../backend/admin/index.html')));
app.get('/admin/index.html', (req, res) => res.sendFile(path.join(__dirname, '../backend/admin/index.html')));
app.get('/admin/consumers', (req, res) => res.sendFile(path.join(__dirname, '../backend/admin/consumers.html')));
app.get('/admin/consumers.html', (req, res) => res.sendFile(path.join(__dirname, '../backend/admin/consumers.html')));
app.get('/admin/dashboard', (req, res) => res.sendFile(path.join(__dirname, '../backend/admin/dashboard.html')));
app.get('/admin/dashboard.html', (req, res) => res.sendFile(path.join(__dirname, '../backend/admin/dashboard.html')));
app.get('/admin/products', (req, res) => res.sendFile(path.join(__dirname, '../backend/admin/products.html')));
app.get('/admin/products.html', (req, res) => res.sendFile(path.join(__dirname, '../backend/admin/products.html')));
app.get('/admin/users', (req, res) => res.sendFile(path.join(__dirname, '../backend/admin/users.html')));
app.get('/admin/users.html', (req, res) => res.sendFile(path.join(__dirname, '../backend/admin/users.html')));
app.get('/admin/roles', (req, res) => res.sendFile(path.join(__dirname, '../backend/admin/roles.html')));
app.get('/admin/roles.html', (req, res) => res.sendFile(path.join(__dirname, '../backend/admin/roles.html')));
app.get('/admin/categories', (req, res) => res.sendFile(path.join(__dirname, '../backend/admin/categories.html')));
app.get('/admin/categories.html', (req, res) => res.sendFile(path.join(__dirname, '../backend/admin/categories.html')));
app.get('/admin/specialties', (req, res) => res.sendFile(path.join(__dirname, '../backend/admin/specialties.html')));
app.get('/admin/specialties.html', (req, res) => res.sendFile(path.join(__dirname, '../backend/admin/specialties.html')));
app.get('/admin/orders', (req, res) => res.sendFile(path.join(__dirname, '../backend/admin/orders.html')));
app.get('/admin/orders.html', (req, res) => res.sendFile(path.join(__dirname, '../backend/admin/orders.html')));
app.get('/admin/comments', (req, res) => res.sendFile(path.join(__dirname, '../backend/admin/comments.html')));
app.get('/admin/comments.html', (req, res) => res.sendFile(path.join(__dirname, '../backend/admin/comments.html')));
app.get('/admin/coupons', (req, res) => res.sendFile(path.join(__dirname, '../backend/admin/coupons.html')));
app.get('/admin/coupons.html', (req, res) => res.sendFile(path.join(__dirname, '../backend/admin/coupons.html')));
app.get('/admin/returns', (req, res) => res.sendFile(path.join(__dirname, '../backend/admin/returns.html')));
app.get('/admin/returns.html', (req, res) => res.sendFile(path.join(__dirname, '../backend/admin/returns.html')));
app.get('/admin/reports', (req, res) => res.sendFile(path.join(__dirname, '../backend/admin/reports.html')));
app.get('/admin/expenses', (req, res) => res.sendFile(path.join(__dirname, '../backend/admin/expenses.html')));
app.get('/admin/reports.html', (req, res) => res.sendFile(path.join(__dirname, '../backend/admin/reports.html')));

// Order history pages (with and without .html)
app.get('/order-history', (req, res) => res.sendFile(path.join(__dirname, '../order-history.html')));
app.get('/order-history.html', (req, res) => res.sendFile(path.join(__dirname, '../order-history.html')));

// Public pages (with and without .html)
app.get('/apropos', (req, res) => res.sendFile(path.join(__dirname, '../public/apropos.html')));
app.get('/apropos.html', (req, res) => res.sendFile(path.join(__dirname, '../public/apropos.html')));
app.get('/about', (req, res) => res.sendFile(path.join(__dirname, '../public/apropos.html')));

app.get('/cart', (req, res) => res.sendFile(path.join(__dirname, '../public/cart.html')));
app.get('/cart.html', (req, res) => res.sendFile(path.join(__dirname, '../public/cart.html')));

app.get('/checkout', (req, res) => res.sendFile(path.join(__dirname, '../public/checkout.html')));
app.get('/checkout.html', (req, res) => res.sendFile(path.join(__dirname, '../public/checkout.html')));

app.get('/contact', (req, res) => res.sendFile(path.join(__dirname, '../public/contact.html')));
app.get('/contact.html', (req, res) => res.sendFile(path.join(__dirname, '../public/contact.html')));

app.get('/contactos', (req, res) => res.sendFile(path.join(__dirname, '../public/contactos.html')));
app.get('/contactos.html', (req, res) => res.sendFile(path.join(__dirname, '../public/contactos.html')));

app.get('/cabazes', (req, res) => res.sendFile(path.join(__dirname, '../public/cabazes.html')));
app.get('/cabazes.html', (req, res) => res.sendFile(path.join(__dirname, '../public/cabazes.html')));

app.get('/coffrets', (req, res) => res.sendFile(path.join(__dirname, '../public/coffrets.html')));
app.get('/coffrets.html', (req, res) => res.sendFile(path.join(__dirname, '../public/coffrets.html')));

app.get('/epicerie', (req, res) => res.sendFile(path.join(__dirname, '../public/epicerie.html')));
app.get('/epicerie.html', (req, res) => res.sendFile(path.join(__dirname, '../public/epicerie.html')));

app.get('/especialidades', (req, res) => res.sendFile(path.join(__dirname, '../public/especialidades.html')));
app.get('/especialidades.html', (req, res) => res.sendFile(path.join(__dirname, '../public/especialidades.html')));

app.get('/mercaria', (req, res) => res.sendFile(path.join(__dirname, '../public/mercaria.html')));
app.get('/mercaria.html', (req, res) => res.sendFile(path.join(__dirname, '../public/mercaria.html')));

app.get('/order-info', (req, res) => res.sendFile(path.join(__dirname, '../public/order-info.html')));
app.get('/order-info.html', (req, res) => res.sendFile(path.join(__dirname, '../public/order-info.html')));

app.get('/sobre', (req, res) => res.sendFile(path.join(__dirname, '../public/sobre.html')));
app.get('/sobre.html', (req, res) => res.sendFile(path.join(__dirname, '../public/sobre.html')));

app.get('/specialites', (req, res) => res.sendFile(path.join(__dirname, '../public/specialites.html')));
app.get('/specialites.html', (req, res) => res.sendFile(path.join(__dirname, '../public/specialites.html')));

app.get('/vin-porto', (req, res) => res.sendFile(path.join(__dirname, '../public/vin-porto.html')));
app.get('/vin-porto.html', (req, res) => res.sendFile(path.join(__dirname, '../public/vin-porto.html')));

app.get('/vinhos-porto', (req, res) => res.sendFile(path.join(__dirname, '../public/vinhos-porto.html')));
app.get('/vinhos-porto.html', (req, res) => res.sendFile(path.join(__dirname, '../public/vinhos-porto.html')));

app.get(['/buyer-login', '/buyer-login.html'], (req, res) => {
  const redirectUrl = '/user/login.html' + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
  res.redirect(302, redirectUrl);
});

app.get('/settings', (req, res) => res.sendFile(path.join(__dirname, '../public/settings.html')));
app.get('/settings.html', (req, res) => res.sendFile(path.join(__dirname, '../public/settings.html')));

app.get('/profiles', (req, res) => res.sendFile(path.join(__dirname, '../public/profiles.html')));
app.get('/profiles.html', (req, res) => res.sendFile(path.join(__dirname, '../public/profiles.html')));

app.get('/help-support', (req, res) => res.sendFile(path.join(__dirname, '../public/help-support.html')));
app.get('/help-support.html', (req, res) => res.sendFile(path.join(__dirname, '../public/help-support.html')));

app.get('/display-accessibility', (req, res) => res.sendFile(path.join(__dirname, '../public/display-accessibility.html')));
app.get('/display-accessibility.html', (req, res) => res.sendFile(path.join(__dirname, '../public/display-accessibility.html')));

app.get('/feedback', (req, res) => res.sendFile(path.join(__dirname, '../public/feedback.html')));
app.get('/feedback.html', (req, res) => res.sendFile(path.join(__dirname, '../public/feedback.html')));

// ===== BACKEND STATIC FILES WITH CACHE HEADERS =====
// Configure backend static file serving with appropriate cache headers
const backendStaticOptions = {
  maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0, // 1 hour cache in production for admin/user files
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    if (process.env.NODE_ENV === 'production') {
      const ext = path.split('.').pop().toLowerCase();

      // Static assets can be cached
      if (['css', 'js', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'woff', 'woff2', 'ttf', 'eot'].includes(ext)) {
        res.setHeader('Cache-Control', 'public, max-age=3600, immutable'); // 1 hour
        res.setHeader('Vary', 'Accept-Encoding');
      }
      // HTML files should not be cached (admin/user interfaces)
      else if (['html', 'htm'].includes(ext)) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
      // Other files get shorter cache
      else {
        res.setHeader('Cache-Control', 'public, max-age=1800'); // 30 minutes
      }
    } else {
      // Development: no caching
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
};

// Serve admin static files (CSS, JS, HTML, etc)
app.use('/admin', express.static(path.join(__dirname, '../backend/admin'), backendStaticOptions));
app.use('/backend/admin', express.static(path.join(__dirname, '../backend/admin'), backendStaticOptions));

// Serve user static files (CSS, JS, HTML, etc)
app.use('/user', express.static(path.join(__dirname, '../backend/user'), backendStaticOptions));
app.use('/backend/user', express.static(path.join(__dirname, '../backend/user'), backendStaticOptions));

// Public category listing route by category id
app.get(['/produits/categorie/:categoryId', '/produtos/categoria/:categoryId', '/products/category/:categoryId'], (req, res) => {
  res.sendFile(path.join(__dirname, '../public/produits.html'));
});

// Public product detail route by slug
app.get(['/produits/:productSlug', '/produtos/:productSlug', '/products/:productSlug'], async (req, res, next) => {
  try {
    const product = await Product.getBySlugOrName(req.params.productSlug);
    if (!product) {
      return res.status(404).sendFile(path.join(__dirname, '../public/404.html'));
    }
    res.sendFile(path.join(__dirname, '../product-detail.html'));
  } catch (err) {
    next(err);
  }
});

// List route aliases for products
app.get(['/produits', '/produtos', '/products'], (req, res) => {
  res.sendFile(path.join(__dirname, '../public/produits.html'));
});

// fallback
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));


/**
 * Global error handler middleware.
 */
app.use(errorHandler);


/**
 * Export the configured Express app instance.
 */
module.exports = app;

