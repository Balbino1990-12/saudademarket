const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const errorHandler = require('./middleware/errorHandler');
const productRoutes = require('./routes/products');
const categoryRoutes = require('./routes/categories');
const userRoutes = require('./routes/users');
const roleRoutes = require('./routes/roles');
const adminRoutes = require('./routes/admin');
const shopifyRoutes = require('./routes/shopify');
const activitiesRoutes = require('./routes/activities');
const specialtiesRoutes = require('./routes/specialties');
const cartRoutes = require('./routes/cart');
const buyerRoutes = require('./routes/buyer');
const orderRoutes = require('./routes/orders');
const recommendationRoutes = require('./routes/recommendations');
const recommendationProductRoutes = require('./routes/recommendationProducts');
const AdminController = require('./controllers/AdminController');
const UserController = require('./controllers/UserController');
const { initDatabase } = require('./config/database');

const app = express();

app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// initialize DB
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

// routes
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/shopify', shopifyRoutes);
app.use('/api/activities', activitiesRoutes);
app.use('/api/specialties', specialtiesRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/buyer', buyerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/recommendation-products', recommendationProductRoutes);

// Public login endpoints - accessible to all users (not admin-only)
app.post('/api/login', AdminController.login);  // Admin login
app.post('/api/user/login', UserController.login);  // User login

// Serve login pages
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, '../backend/admin/login.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, '../backend/admin/login.html')));
app.get('/admin/login', (req, res) => res.sendFile(path.join(__dirname, '../backend/admin/login.html')));
app.get('/user/login.html', (req, res) => res.sendFile(path.join(__dirname, '../public/buyer-login.html')));
app.get('/user/register.html', (req, res) => res.sendFile(path.join(__dirname, '../backend/user/register.html')));

// Serve admin static files (CSS, JS, HTML, etc)
app.use('/admin', express.static(path.join(__dirname, '../backend/admin')));

// Serve user static files (CSS, JS, HTML, etc)
app.use('/user', express.static(path.join(__dirname, '../backend/user')));

// fallback
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));

app.use(errorHandler);

module.exports = app;
