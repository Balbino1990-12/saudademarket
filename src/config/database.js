const mysql = require('mysql2/promise');
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { slugify } = require('../utils/helpers');

const DB_NAME = process.env.DB_NAME || 'portugalstore_db';
const isTestMode = process.env.NODE_ENV === 'test';
const log = (...args) => { if (!isTestMode) console.log(...args); };
const warn = (...args) => { if (!isTestMode) console.warn(...args); };
const errLog = (...args) => { if (!isTestMode) console.error(...args); };

// Export object that will hold the pool
const db = {
  pool: null
};

/**
 * Initialize database connection and create tables
 */
async function initDatabase() {
  // In test environment, skip database creation but still create tables
  if (process.env.NODE_ENV === 'test') {
    log('Test mode: creating database pool and tables');
    // Create the pool with test database
    db.pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'portugalstore_test',
      charset: 'utf8mb4',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    // Create tables
    await createTables();
    return;
  }

  try {
    // First, create a connection without database to create the database if it doesn't exist
    const adminConn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      charset: 'utf8mb4'
    });

    // Create database if it doesn't exist and ensure utf8mb4 charset
    await adminConn.query(`CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await adminConn.query(`ALTER DATABASE ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    log(`✓ Database '${DB_NAME}' ready with utf8mb4`);
    await adminConn.end();

    // Now create the pool with the database
    db.pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: DB_NAME,
      charset: 'utf8mb4',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // Create tables
    await createTables();
  } catch (err) {
    errLog('✗ Database initialization failed:', err.message);
    throw err;
  }
}

/**
 * Create database tables
 */
async function createTables() {
  const createRoles = `
    CREATE TABLE IF NOT EXISTS roles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      description TEXT DEFAULT NULL,
      permissions JSON DEFAULT NULL,
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_role_name (name),
      INDEX idx_role_active (active)
    ) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  const createUsers = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) NOT NULL UNIQUE,
      email VARCHAR(255) UNIQUE DEFAULT NULL,
      password VARCHAR(255) NOT NULL,
      first_name VARCHAR(100) DEFAULT '',
      last_name VARCHAR(100) DEFAULT '',
      phone_number VARCHAR(20) DEFAULT NULL,
      city VARCHAR(100) DEFAULT NULL,
      last_login DATETIME DEFAULT NULL,
      role_id INT DEFAULT NULL,
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_username (username),
      INDEX idx_email (email),
      INDEX idx_role_id (role_id),
      INDEX idx_user_active (active),
      CONSTRAINT fk_user_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL ON UPDATE CASCADE
    ) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  const createCategories = `
    CREATE TABLE IF NOT EXISTS categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name_en VARCHAR(255) NOT NULL UNIQUE,
      name_fr VARCHAR(255) NOT NULL,
      name_pt VARCHAR(255) NOT NULL,
      description TEXT DEFAULT NULL,
      icon VARCHAR(10) DEFAULT '📦',
      color VARCHAR(7) DEFAULT '#c41e1e',
      parent_id INT DEFAULT NULL,
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_category_parent_id (parent_id),
      INDEX idx_category_name_en (name_en),
      INDEX idx_category_active (active)
    ) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  const createProducts = `
    CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      slug VARCHAR(255) DEFAULT NULL UNIQUE,
      name_fr VARCHAR(255) NOT NULL,
      name_pt VARCHAR(255) NOT NULL,
      name_en VARCHAR(255) NOT NULL,
      category_id INT NOT NULL,
      user_id INT NOT NULL,
      quantity INT NOT NULL DEFAULT 0,
      price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      is_featured BOOLEAN NOT NULL DEFAULT FALSE,
      promo_price DECIMAL(10,2) DEFAULT NULL,
      promo_label VARCHAR(100) DEFAULT NULL,
      promo_expires_at DATETIME DEFAULT NULL,
      image VARCHAR(500) DEFAULT NULL,
      description TEXT DEFAULT NULL,
      rating DECIMAL(2,1) DEFAULT NULL,
      specs JSON DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_products_category_id (category_id),
      INDEX idx_products_user_id (user_id),
      INDEX idx_products_name_en (name_en),
      INDEX idx_products_is_featured (is_featured),
      INDEX idx_products_promo_expires_at (promo_expires_at),
      CONSTRAINT fk_product_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT fk_product_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  const createAdmins = `
    CREATE TABLE IF NOT EXISTS admins (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      email VARCHAR(255) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  const createActivities = `
    CREATE TABLE IF NOT EXISTS activities (
      id INT AUTO_INCREMENT PRIMARY KEY,
      type VARCHAR(100) NOT NULL,
      message TEXT NOT NULL,
      details JSON DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_activity_type (type)
    ) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  const createAnalyticsEvents = `
    CREATE TABLE IF NOT EXISTS analytics_events (
      id INT AUTO_INCREMENT PRIMARY KEY,
      event_type ENUM('page_view','session_start','session_end') NOT NULL DEFAULT 'page_view',
      visitor_id VARCHAR(128) DEFAULT NULL,
      session_id VARCHAR(128) DEFAULT NULL,
      url VARCHAR(500) DEFAULT NULL,
      referrer VARCHAR(500) DEFAULT NULL,
      title VARCHAR(255) DEFAULT NULL,
      user_agent VARCHAR(512) DEFAULT NULL,
      ip_address VARCHAR(45) DEFAULT NULL,
      metadata JSON DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_analytics_event_type (event_type),
      INDEX idx_analytics_visitor_id (visitor_id),
      INDEX idx_analytics_session_id (session_id),
      INDEX idx_analytics_created_at (created_at)
    ) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  const createSpecialties = `
    CREATE TABLE IF NOT EXISTS specialties (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name_en VARCHAR(255) NOT NULL,
      name_fr VARCHAR(255) NOT NULL,
      name_pt VARCHAR(255) NOT NULL,
      category VARCHAR(100) DEFAULT NULL,
      description TEXT DEFAULT NULL,
      image VARCHAR(500) DEFAULT NULL,
      icon VARCHAR(10) DEFAULT '✨',
      color VARCHAR(7) DEFAULT '#c41e1e',
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_specialty_category (category),
      INDEX idx_specialty_active (active)
    ) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  const createSpecialtyProducts = `
    CREATE TABLE IF NOT EXISTS specialty_products (
      specialty_id INT NOT NULL,
      product_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (specialty_id, product_id),
      INDEX idx_specialty_product_specialty_id (specialty_id),
      INDEX idx_specialty_product_product_id (product_id),
      CONSTRAINT fk_specialty_products_specialty FOREIGN KEY (specialty_id) REFERENCES specialties(id) ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT fk_specialty_products_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  const createCart = `
    CREATE TABLE IF NOT EXISTS cart (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      product_id INT NOT NULL,
      quantity INT NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_cart_user_product (user_id, product_id),
      INDEX idx_cart_user_id (user_id),
      INDEX idx_cart_product_id (product_id),
      CONSTRAINT fk_cart_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT fk_cart_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  const createRecommendationProducts = `
    CREATE TABLE IF NOT EXISTS recommendation_products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_id INT NOT NULL,
      priority INT NOT NULL DEFAULT 0,
      active BOOLEAN NOT NULL DEFAULT true,
      created_by INT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_recommendation_priority (priority),
      INDEX idx_recommendation_active (active),
      CONSTRAINT fk_recommendation_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT fk_recommendation_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
    ) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  const createOrders = `
    CREATE TABLE IF NOT EXISTS orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_serial VARCHAR(64) NOT NULL UNIQUE,
      buyer_id INT NOT NULL,
      coupon_code VARCHAR(64) DEFAULT NULL,
      discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      shipping_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      shipping_method VARCHAR(100) DEFAULT 'Standard',
      shipping_status ENUM('pending','processing','shipped','delivered','cancelled') NOT NULL DEFAULT 'pending',
      status ENUM('pending','confirmed','cancelled','returned','completed') NOT NULL DEFAULT 'pending',
      tracking_number VARCHAR(128) DEFAULT NULL,
      address TEXT DEFAULT NULL,
      notes TEXT DEFAULT NULL,
      items JSON DEFAULT NULL,
      total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_orders_buyer_id (buyer_id),
      INDEX idx_orders_status (status),
      INDEX idx_orders_shipping_status (shipping_status),
      INDEX idx_orders_coupon_code (coupon_code),
      CONSTRAINT fk_order_buyer FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
    ) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  const createCoupons = `
    CREATE TABLE IF NOT EXISTS coupons (
      id INT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(64) NOT NULL UNIQUE,
      type ENUM('percent','fixed','free_shipping') NOT NULL DEFAULT 'fixed',
      value DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      min_order_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      uses_left INT DEFAULT NULL,
      valid_from DATETIME DEFAULT NULL,
      valid_to DATETIME DEFAULT NULL,
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_coupons_code (code),
      INDEX idx_coupons_active (active)
    ) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  const createOrderItems = `
    CREATE TABLE IF NOT EXISTS order_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      product_id INT NOT NULL,
      quantity INT NOT NULL DEFAULT 1,
      price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_order_items_order_id (order_id),
      INDEX idx_order_items_product_id (product_id),
      CONSTRAINT fk_order_item_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT fk_order_item_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  const createCheckouts = `
    CREATE TABLE IF NOT EXISTS checkouts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      buyer_id INT NOT NULL,
      total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      currency VARCHAR(10) NOT NULL DEFAULT 'EUR',
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      checkout_url VARCHAR(500) DEFAULT NULL,
      payment_method VARCHAR(100) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_checkouts_order_id (order_id),
      INDEX idx_checkouts_buyer_id (buyer_id),
      CONSTRAINT fk_checkout_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT fk_checkout_buyer FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
    ) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  const createComments = `
    CREATE TABLE IF NOT EXISTS comments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT DEFAULT NULL,
      product_id INT DEFAULT NULL,
      title VARCHAR(255) DEFAULT NULL,
      body TEXT NOT NULL,
      rating DECIMAL(2,1) DEFAULT NULL,
      status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_comments_user_id (user_id),
      INDEX idx_comments_product_id (product_id),
      INDEX idx_comments_status (status),
      CONSTRAINT fk_comment_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT fk_comment_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  const createReturns = `
    CREATE TABLE IF NOT EXISTS returns (
      id INT AUTO_INCREMENT PRIMARY KEY,
      rma_number VARCHAR(64) NOT NULL UNIQUE,
      order_id INT NOT NULL,
      buyer_id INT NOT NULL,
      product_id INT NOT NULL,
      quantity INT NOT NULL DEFAULT 1,
      reason TEXT NOT NULL,
      condition_description TEXT DEFAULT NULL,
      status ENUM('pending','approved','rejected','received','refunded','exchanged') NOT NULL DEFAULT 'pending',
      refund_amount DECIMAL(12,2) DEFAULT 0.00,
      refund_method VARCHAR(50) DEFAULT NULL,
      admin_notes TEXT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_rma_number (rma_number),
      INDEX idx_order_id (order_id),
      INDEX idx_buyer_id (buyer_id),
      INDEX idx_product_id (product_id),
      INDEX idx_status (status),
      CONSTRAINT fk_return_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT fk_return_buyer FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT fk_return_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  const createReferrals = `
    CREATE TABLE IF NOT EXISTS referrals (
      id INT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(64) NOT NULL UNIQUE,
      referrer_user_id INT NOT NULL,
      product_id INT DEFAULT NULL,
      discount_type ENUM('percent','fixed') NOT NULL DEFAULT 'percent',
      discount_value DECIMAL(10,2) NOT NULL DEFAULT 10.00,
      max_uses INT DEFAULT NULL,
      uses_count INT NOT NULL DEFAULT 0,
      expires_at DATETIME DEFAULT NULL,
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_referrals_code (code),
      INDEX idx_referrals_referrer_user_id (referrer_user_id),
      INDEX idx_referrals_product_id (product_id),
      INDEX idx_referrals_active (active),
      CONSTRAINT fk_referral_referrer FOREIGN KEY (referrer_user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT fk_referral_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL ON UPDATE CASCADE
    ) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  const createReferralUses = `
    CREATE TABLE IF NOT EXISTS referral_uses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      referral_id INT NOT NULL,
      buyer_user_id INT NOT NULL,
      order_id INT NOT NULL,
      discount_applied DECIMAL(10,2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_referral_uses_referral_id (referral_id),
      INDEX idx_referral_uses_buyer_user_id (buyer_user_id),
      INDEX idx_referral_uses_order_id (order_id),
      CONSTRAINT fk_referral_uses_referral FOREIGN KEY (referral_id) REFERENCES referrals(id) ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT fk_referral_uses_buyer FOREIGN KEY (buyer_user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT fk_referral_uses_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  const createExpenses = `
    CREATE TABLE IF NOT EXISTS expenses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      category VARCHAR(100) NOT NULL,
      description TEXT,
      amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      expense_date DATE NOT NULL,
      created_by INT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_expenses_category (category),
      INDEX idx_expenses_date (expense_date),
      INDEX idx_expenses_created_by (created_by),
      CONSTRAINT fk_expense_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
    ) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  try {
    await db.pool.query(createRoles);
    await db.pool.query(createUsers);
    await db.pool.query(createCategories);
    await db.pool.query(createProducts);
    await db.pool.query(createAdmins);
    await db.pool.query(createActivities);
    await db.pool.query(createAnalyticsEvents);
    await db.pool.query(createSpecialties);
    await db.pool.query(createSpecialtyProducts);
    await db.pool.query(createCart);
    await db.pool.query(createRecommendationProducts);
    await db.pool.query(createOrders);
    await db.pool.query(createCoupons);

    try {
      await db.pool.query(`ALTER TABLE coupons MODIFY COLUMN type ENUM('percent','fixed','free_shipping') NOT NULL DEFAULT 'fixed'`);
      log('✓ Updated coupons.type enum to include free_shipping');
    } catch (err) {
      if (err.code !== 'ER_BAD_FIELD_ERROR' && err.code !== 'ER_DUP_FIELDNAME') {
        warn('⚠ Could not update coupons.type enum:', err.message);
      }
    }

    try {
      await db.pool.query(`ALTER TABLE coupons MODIFY COLUMN value DECIMAL(12,2) NOT NULL DEFAULT 0.00`);
      log('✓ Updated coupons.value column to DECIMAL(12,2)');
    } catch (err) {
      if (err.code !== 'ER_BAD_FIELD_ERROR' && err.code !== 'ER_DUP_FIELDNAME') {
        warn('⚠ Could not update coupons.value column:', err.message);
      }
    }

    await db.pool.query(createOrderItems);
    await db.pool.query(createCheckouts);
    await db.pool.query(createComments);
    await db.pool.query(createReturns);
    await db.pool.query(createReferrals);
    await db.pool.query(createReferralUses);
    await db.pool.query(createExpenses);


  // Ensure comments table is utf8mb4 for Portuguese/French accents
  await db.pool.query(`ALTER TABLE comments CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

  // ===== ADD PERFORMANCE INDEXES TO PRODUCTS TABLE =====
  // These indexes optimize hot SQL paths for product queries
  try {
    await db.pool.query(`CREATE INDEX idx_products_created_at ON products (created_at DESC)`);
    log('✓ Added idx_products_created_at index to products table');
  } catch (err) {
    if (!err.message.includes('Duplicate key name')) {
      warn('⚠ Could not add idx_products_created_at index:', err.message);
    }
  }

  try {
    await db.pool.query(`CREATE INDEX idx_products_user_created_at ON products (user_id, created_at DESC)`);
    log('✓ Added idx_products_user_created_at index to products table');
  } catch (err) {
    if (!err.message.includes('Duplicate key name')) {
      warn('⚠ Could not add idx_products_user_created_at index:', err.message);
    }
  }

  try {
    await db.pool.query(`CREATE INDEX idx_products_category_created_at ON products (category_id, created_at DESC)`);
    log('✓ Added idx_products_category_created_at index to products table');
  } catch (err) {
    if (!err.message.includes('Duplicate key name')) {
      warn('⚠ Could not add idx_products_category_created_at index:', err.message);
    }
  }

  try {
    await db.pool.query(`CREATE INDEX idx_products_category_name_en ON products (category_id, name_en)`);
    log('✓ Added idx_products_category_name_en index to products table');
  } catch (err) {
    if (!err.message.includes('Duplicate key name')) {
      warn('⚠ Could not add idx_products_category_name_en index:', err.message);
    }
  }

  try {
    await db.pool.query(`CREATE INDEX idx_products_category_name_pt ON products (category_id, name_pt)`);
    log('✓ Added idx_products_category_name_pt index to products table');
  } catch (err) {
    if (!err.message.includes('Duplicate key name')) {
      warn('⚠ Could not add idx_products_category_name_pt index:', err.message);
    }
  }

  try {
    await db.pool.query(`CREATE INDEX idx_products_category_name_fr ON products (category_id, name_fr)`);
    log('✓ Added idx_products_category_name_fr index to products table');
  } catch (err) {
    if (!err.message.includes('Duplicate key name')) {
      warn('⚠ Could not add idx_products_category_name_fr index:', err.message);
    }
  }

  try {
    await db.pool.query(`CREATE FULLTEXT INDEX idx_products_fulltext ON products (name_en, name_fr, name_pt, description)`);
    log('✓ Added idx_products_fulltext fulltext index to products table');
  } catch (err) {
    if (!err.message.includes('Duplicate key name')) {
      warn('⚠ Could not add idx_products_fulltext fulltext index:', err.message);
    }
  }

  // Add missing columns to users table if they don't exist
  try {
    const checkPhoneNumber = `ALTER TABLE users ADD COLUMN phone_number VARCHAR(20) DEFAULT NULL`;
    const checkCity = `ALTER TABLE users ADD COLUMN city VARCHAR(100) DEFAULT NULL`;
    
    try {
      await db.pool.query(checkPhoneNumber);
      log('✓ Added phone_number column to users table');
    } catch (err) {
      if (!err.message.includes('Duplicate column')) {
        warn('⚠ Could not add phone_number column:', err.message);
      }
    }

    try {
      await db.pool.query(checkCity);
      log('✓ Added city column to users table');
    } catch (err) {
      if (!err.message.includes('Duplicate column')) {
        warn('⚠ Could not add city column:', err.message);
      }
    }

    try {
      await db.pool.query(`ALTER TABLE users ADD COLUMN last_login DATETIME NULL DEFAULT NULL`);
      log('✓ Added last_login column to users table');
    } catch (err) {
      if (!err.message.includes('Duplicate column')) {
        warn('⚠ Could not add last_login column:', err.message);
      }
    }
  } catch (err) {
    warn('Could not update users table schema:', err.message);
  }

  // Ensure products table has slug column and backfill existing values
  try {
    try {
      await db.pool.query(`ALTER TABLE products ADD COLUMN slug VARCHAR(255) NULL AFTER id`);
      log('✓ Added slug column to products table');
    } catch (err) {
      if (!err.message.includes('Duplicate column')) {
        warn('⚠ Could not add slug column to products table:', err.message);
      }
    }

    try {
      await db.pool.query(`CREATE UNIQUE INDEX idx_products_slug ON products (slug)`);
      log('✓ Added unique idx_products_slug index to products table');
    } catch (err) {
      if (!err.message.includes('Duplicate key name') && !err.message.includes('Duplicate key')) {
        warn('⚠ Could not add idx_products_slug index:', err.message);
      }
    }

    const [missingSlugRows] = await db.pool.query(`SELECT id, name_en, name_fr, name_pt FROM products WHERE slug IS NULL OR slug = ''`);
    for (const row of missingSlugRows) {
      const source = row.name_en || row.name_fr || row.name_pt || `product-${row.id}`;
      const slug = await generateUniqueProductSlug(row.id, source);
      await db.pool.query(`UPDATE products SET slug = ? WHERE id = ?`, [slug, row.id]);
      log(`✓ Backfilled product ${row.id} -> ${slug}`);
    }
  } catch (err) {
    warn('Could not update products table schema:', err.message);
  }

  // Ensure orders table has order_serial (for legacy databases)
  try {
    await db.pool.query(`ALTER TABLE orders ADD COLUMN order_serial VARCHAR(64) NULL UNIQUE AFTER id`);
    log('✓ Added order_serial column to orders table (nullable temporary)');
  } catch (err) {
    if (!err.message.includes('Duplicate column')) {
      warn('⚠ Could not add order_serial column:', err.message);
    }
  }

  try {
    await db.pool.query(`ALTER TABLE orders ADD COLUMN coupon_code VARCHAR(64) DEFAULT NULL AFTER order_serial`);
    log('✓ Added coupon_code column to orders table (legacy)');
  } catch (err) {
    if (!err.message.includes('Duplicate column')) {
      warn('⚠ Could not add coupon_code column:', err.message);
    }
  }

  try {
    await db.pool.query(`ALTER TABLE orders ADD COLUMN discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER coupon_code`);
    log('✓ Added discount_amount column to orders table (legacy)');
  } catch (err) {
    if (!err.message.includes('Duplicate column')) {
      warn('⚠ Could not add discount_amount column to orders table (legacy)', err.message);
    }
  }

  try {
    await db.pool.query(`ALTER TABLE orders ADD COLUMN shipping_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER discount_amount`);
    log('✓ Added shipping_cost column to orders table (legacy)');
  } catch (err) {
    if (!err.message.includes('Duplicate column')) {
      warn('⚠ Could not add shipping_cost column to orders table (legacy)', err.message);
    }
  }

  try {
    await db.pool.query(`ALTER TABLE orders ADD COLUMN shipping_method VARCHAR(100) DEFAULT 'Standard' AFTER shipping_cost`);
    log('✓ Added shipping_method column to orders table (legacy)');
  } catch (err) {
    if (!err.message.includes('Duplicate column')) {
      warn('⚠ Could not add shipping_method column to orders table (legacy)', err.message);
    }
  }

  try {
    await db.pool.query(`ALTER TABLE orders ADD COLUMN shipping_status ENUM('pending','processing','shipped','delivered','cancelled') NOT NULL DEFAULT 'pending' AFTER shipping_method`);
    log('✓ Added shipping_status column to orders table (legacy)');
  } catch (err) {
    if (!err.message.includes('Duplicate column')) {
      warn('⚠ Could not add shipping_status column to orders table (legacy)', err.message);
    }
  }

  try {
    await db.pool.query(`ALTER TABLE orders ADD COLUMN tracking_number VARCHAR(128) DEFAULT NULL AFTER shipping_status`);
    log('✓ Added tracking_number column to orders table (legacy)');
  } catch (err) {
    if (!err.message.includes('Duplicate column')) {
      warn('⚠ Could not add tracking_number column to orders table (legacy)', err.message);
    }
  }

  try {
    await db.pool.query(`ALTER TABLE orders ADD COLUMN referral_code VARCHAR(64) DEFAULT NULL AFTER coupon_code`);
    log('✓ Added referral_code column to orders table');
  } catch (err) {
    if (!err.message.includes('Duplicate column')) {
      warn('⚠ Could not add referral_code column to orders table:', err.message);
    }
  }

  // Migrate products table: rename 'category' column to 'category_id' if it exists
  try {
    // First check if products table has old 'category' column but not 'category_id'
    const [columns] = await db.pool.query(`SHOW COLUMNS FROM products`);
    const hasOldCategory = columns.some(col => col.Field === 'category');
    const hasNewCategoryId = columns.some(col => col.Field === 'category_id');
    const hasCreatedAt = columns.some(col => col.Field === 'created_at');
    const hasQuantity = columns.some(col => col.Field === 'quantity');

    if (hasOldCategory && !hasNewCategoryId) {
      // Rename 'category' to 'category_id'
      await db.pool.query(`ALTER TABLE products CHANGE COLUMN category category_id VARCHAR(255) NOT NULL`);
      log('✓ Renamed category column to category_id in products table');
    }

    // Add timestamps if missing
    if (!hasCreatedAt) {
      await db.pool.query(`ALTER TABLE products ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
      await db.pool.query(`ALTER TABLE products ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
      log('✓ Added timestamps to products table');
    }

    if (!hasQuantity) {
      await db.pool.query(`ALTER TABLE products ADD COLUMN quantity INT NOT NULL DEFAULT 0 AFTER user_id`);
      log('âœ“ Added quantity column to products table');
    }

    // Add rating column if missing
    const hasRating = columns.some(col => col.Field === 'rating');
    if (!hasRating) {
      try {
        await db.pool.query(`ALTER TABLE products ADD COLUMN rating DECIMAL(2,1) DEFAULT NULL AFTER description`);
        log('✓ Added rating column to products table');
      } catch (err) {
        if (!err.message.includes('Duplicate column')) {
          warn('⚠ Could not add rating column:', err.message);
        }
      }
    }

    // Add specs column if missing
    const hasSpecs = columns.some(col => col.Field === 'specs');
    if (!hasSpecs) {
      try {
        await db.pool.query(`ALTER TABLE products ADD COLUMN specs JSON DEFAULT NULL AFTER rating`);
        log('✓ Added specs column to products table');
      } catch (err) {
        if (!err.message.includes('Duplicate column')) {
          warn('⚠ Could not add specs column:', err.message);
        }
      }
    }

    // Add promotion columns if missing
    const hasFeatured = columns.some(col => col.Field === 'is_featured');
    const hasPromoPrice = columns.some(col => col.Field === 'promo_price');
    const hasPromoLabel = columns.some(col => col.Field === 'promo_label');
    const hasPromoExpiresAt = columns.some(col => col.Field === 'promo_expires_at');

    if (!hasFeatured) {
      try {
        await db.pool.query(`ALTER TABLE products ADD COLUMN is_featured BOOLEAN NOT NULL DEFAULT FALSE AFTER price`);
        log('✓ Added is_featured column to products table');
      } catch (err) {
        if (!err.message.includes('Duplicate column')) {
          warn('⚠ Could not add is_featured column:', err.message);
        }
      }
    }

    if (!hasPromoPrice) {
      try {
        await db.pool.query(`ALTER TABLE products ADD COLUMN promo_price DECIMAL(10,2) DEFAULT NULL AFTER is_featured`);
        log('✓ Added promo_price column to products table');
      } catch (err) {
        if (!err.message.includes('Duplicate column')) {
          warn('⚠ Could not add promo_price column:', err.message);
        }
      }
    }

    if (!hasPromoLabel) {
      try {
        await db.pool.query(`ALTER TABLE products ADD COLUMN promo_label VARCHAR(100) DEFAULT NULL AFTER promo_price`);
        log('✓ Added promo_label column to products table');
      } catch (err) {
        if (!err.message.includes('Duplicate column')) {
          warn('⚠ Could not add promo_label column:', err.message);
        }
      }
    }

    if (!hasPromoExpiresAt) {
      try {
        await db.pool.query(`ALTER TABLE products ADD COLUMN promo_expires_at DATETIME DEFAULT NULL AFTER promo_label`);
        log('✓ Added promo_expires_at column to products table');
      } catch (err) {
        if (!err.message.includes('Duplicate column')) {
          warn('⚠ Could not add promo_expires_at column:', err.message);
        }
      }
    }
  } catch (err) {
    warn('⚠ Could not migrate products promotion columns:', err.message);
  }


    // Add index on category_id if it doesn't exist
    const [indexes] = await db.pool.query(`SHOW INDEX FROM products WHERE Column_name = 'category_id'`);
    if (indexes.length === 0) {
      await db.pool.query(`ALTER TABLE products ADD INDEX idx_category_id (category_id)`);
      log('✓ Added index on category_id');
    }

    // Drop old foreign key if it exists and recreate it
    try {
      await db.pool.query(`ALTER TABLE products DROP FOREIGN KEY fk_product_category`);
      log('✓ Dropped existing foreign key');
    } catch (err) {
      // Foreign key doesn't exist, which is fine
    }

    // Add foreign key constraint
    try {
      await db.pool.query(`ALTER TABLE products ADD CONSTRAINT fk_product_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT ON UPDATE CASCADE`);
      log('✓ Added foreign key constraint: products.category_id -> categories.id');
    } catch (err) {
      if (!err.message.includes('already exists')) {
        warn('⚠ Could not add foreign key constraint:', err.message);
      }
    }
  } catch (err) {
    warn('⚠ Could not migrate products table schema:', err.message);
  }

  // Migrate products table: add user_id column if it doesn't exist
  try {
    const [columns] = await db.pool.query(`SHOW COLUMNS FROM products`);
    const hasUserId = columns.some(col => col.Field === 'user_id');
    const hasSellerId = columns.some(col => col.Field === 'seller_id');

    log(`❖ Product table columns check: hasUserId=${hasUserId}, hasSellerId=${hasSellerId}`);

    // Migrate from seller_id to user_id if seller_id exists and user_id doesn't
    if (hasSellerId && !hasUserId) {
      log('↻ Migrating seller_id to user_id in products table...');
      try {
        await db.pool.query(`ALTER TABLE products DROP FOREIGN KEY fk_product_seller`);
      } catch (err) {
        // Foreign key might not exist
      }
      await db.pool.query(`ALTER TABLE products CHANGE COLUMN seller_id user_id INT`);
      log('✓ Renamed seller_id to user_id');
    }
    // Only add user_id column if neither seller_id nor user_id exist
    else if (!hasUserId && !hasSellerId) {
      log('↻ Adding user_id column to products table...');
      
      // Add user_id column (nullable initially)
      await db.pool.query(`ALTER TABLE products ADD COLUMN user_id INT DEFAULT NULL`);
      log('✓ Added user_id column to products table');
    }

    // Ensure all products have a user_id (set to 1 if NULL)
    try {
      const [result] = await db.pool.query(`SELECT COUNT(*) as count FROM products WHERE user_id IS NULL`);
      if (result[0].count > 0) {
        log(`↻ Setting user_id for ${result[0].count} products without user...`);
        await db.pool.query(`UPDATE products SET user_id = 1 WHERE user_id IS NULL`);
        log('✓ Defaulted user_id to 1 for orphaned products');
      }
    } catch (err) {
      warn('⚠ Could not update orphaned products:', err.message);
    }

    // Make user_id NOT NULL
    try {
      await db.pool.query(`ALTER TABLE products MODIFY user_id INT NOT NULL`);
      log('✓ Set user_id as NOT NULL');
    } catch (err) {
      // Might already be NOT NULL
      if (!err.message.includes('Syntax error')) {
        warn('⚠ Could not make user_id NOT NULL:', err.message);
      }
    }

    // Add foreign key constraint for user_id
    try {
      await db.pool.query(`ALTER TABLE products DROP FOREIGN KEY fk_product_user`);
    } catch (err) {
      // Foreign key doesn't exist, which is fine
    }

    try {
      await db.pool.query(`ALTER TABLE products ADD CONSTRAINT fk_product_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE`);
      log('✓ Added foreign key constraint: products.user_id -> users.id');
    } catch (err) {
      if (!err.message.includes('already exists')) {
        warn('⚠ Could not add user foreign key constraint:', err.message);
      }
    }

    // Add index on user_id if it doesn't exist
    try {
      await db.pool.query(`ALTER TABLE products ADD INDEX idx_user_id (user_id)`);
      log('✓ Added index on user_id');
    } catch (err) {
      if (!err.message.includes('already exists') && !err.message.includes('Duplicate key')) {
        warn('⚠ Could not add index on user_id:', err.message);
      }
    }
  } catch (err) {
    warn('⚠ Could not migrate user_id column:', err.message);
  }

  // Migrate users table: add role_id column and migrate from role varchar
  try {
    const [columns] = await db.pool.query(`SHOW COLUMNS FROM users`);
    const hasRoleId = columns.some(col => col.Field === 'role_id');
    const hasRoleVarchar = columns.some(col => col.Field === 'role');

    log(`❖ Users table columns check: hasRoleId=${hasRoleId}, hasRoleVarchar=${hasRoleVarchar}`);

    // If role_id doesn't exist, add it
    if (!hasRoleId) {
      log('↻ Adding role_id column to users table...');
      await db.pool.query(`ALTER TABLE users ADD COLUMN role_id INT DEFAULT NULL`);
      log('✓ Added role_id column to users table');
    }

    // If both exist, migrate data from role varchar to role_id
    if (hasRoleVarchar && hasRoleId) {
      log('↻ Migrating role names to role_id mapping...');
      
      // Get all unique role names from users table
      const [userRoles] = await db.pool.query(`SELECT DISTINCT role FROM users WHERE role IS NOT NULL AND role != ''`);
      
      for (const userRole of userRoles) {
        const roleName = userRole.role;
        // Check if this role exists in roles table
        const [existingRole] = await db.pool.query(`SELECT id FROM roles WHERE name = ?`, [roleName]);
        
        if (existingRole.length > 0) {
          const roleId = existingRole[0].id;
          // Update users with this role name to have the correct role_id
          await db.pool.query(`UPDATE users SET role_id = ? WHERE role = ?`, [roleId, roleName]);
          log(`✓ Migrated role '${roleName}' to role_id ${roleId}`);
        }
      }
    }

    // Add foreign key constraint if it doesn't exist
    try {
      await db.pool.query(`ALTER TABLE users DROP FOREIGN KEY fk_user_role`);
    } catch (err) {
      // Foreign key doesn't exist, which is fine
    }

    try {
      await db.pool.query(`ALTER TABLE users ADD CONSTRAINT fk_user_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL ON UPDATE CASCADE`);
      log('✓ Added foreign key constraint: users.role_id -> roles.id');
    } catch (err) {
      if (!err.message.includes('already exists')) {
        warn('⚠ Could not add role foreign key constraint:', err.message);
      }
    }

    // Drop old role column if it exists (after migration)
    if (hasRoleVarchar && hasRoleId) {
      try {
        // Check if there are any remaining NULL values in role_id
        const [nullCount] = await db.pool.query(`SELECT COUNT(*) as count FROM users WHERE role_id IS NULL`);
        if (nullCount[0].count > 0) {
          log(`↻ Setting default role_id for ${nullCount[0].count} users...`);
          // Set default role_id to 1 (admin or first role)
          const [firstRole] = await db.pool.query(`SELECT id FROM roles ORDER BY id LIMIT 1`);
          if (firstRole.length > 0) {
            await db.pool.query(`UPDATE users SET role_id = ? WHERE role_id IS NULL`, [firstRole[0].id]);
            log('✓ Defaulted role_id to first available role');
          }
        }
        
        // Now drop the old role column
        await db.pool.query(`ALTER TABLE users DROP COLUMN role`);
        log('✓ Dropped old role varchar column');
      } catch (err) {
        warn('⚠ Could not drop old role column:', err.message);
      }
    }
  } catch (err) {
    warn('⚠ Could not migrate role_id column:', err.message);
  }

  // Seed or normalize categories to the requested category list
  try {
    const defaultCategories = [
      { name_en: 'Grocery', name_fr: 'Épicerie', name_pt: 'Mercearia', icon: '🛒', description: 'Produtos de mercearia' },
      { name_en: 'Sweets & Desserts', name_fr: 'Douceurs & Desserts', name_pt: 'Doces & Sobremesas', icon: '🍰', description: 'Doces, sobremesas e guloseimas' },
      { name_en: 'Bakery & Pastries', name_fr: 'Boulangerie & Pâtisserie', name_pt: 'Padaria & Pastelaria', icon: '🥐', description: 'Pães, bolos e pastelaria' },
      { name_en: 'Olive Oils & Oils', name_fr: 'Huiles d\'olive & Huiles', name_pt: 'Azeite & Oleos', icon: '🫒', description: 'Azeites, óleos e condimentos' },
      { name_en: 'Fruit & Vegetables', name_fr: 'Fruits & Légumes', name_pt: 'Fruta & Legumes', icon: '🍎', description: 'Frutas frescas e legumes' },
      { name_en: 'Cold Cuts & Cheeses', name_fr: 'Charcuterie & Fromages', name_pt: 'Charcutaria & Queijos', icon: '🧀', description: 'Charcutaria, enchidos e queijos' },
      { name_en: 'Dairy', name_fr: 'Produits Laitiers', name_pt: 'Laticínios', icon: '🥛', description: 'Produtos lácteos' },
      { name_en: 'Frozen', name_fr: 'Surgelés', name_pt: 'Congelados', icon: '🧊', description: 'Produtos congelados' },
      { name_en: 'Coffee & Teas', name_fr: 'Café & Thés', name_pt: 'Café & Chás', icon: '☕', description: 'Cafés e chás' },
      { name_en: 'Juices & Waters', name_fr: 'Jus & Eaux', name_pt: 'Sumos & Aguas', icon: '🥤', description: 'Sumos, águas e refrigerantes' },
      { name_en: 'Wines & Traditional Drinks', name_fr: 'Vins & Boissons Traditionnelles', name_pt: 'Vinhos & Bebidas Tradicionais', icon: '🍷', description: 'Vinhos e bebidas portuguesas tradicionais' },
      { name_en: 'Hygiene', name_fr: 'Hygiène', name_pt: 'Higiene', icon: '🧼', description: 'Produtos de higiene pessoal' },
      { name_en: 'Detergent', name_fr: 'Détergent', name_pt: 'Detergente', icon: '🧴', description: 'Detergentes e produtos de limpeza' },
      { name_en: 'Promotions', name_fr: 'Promotions', name_pt: 'Promoções', icon: '🔥', description: 'Ofertas e promoções especiais' }
    ];

    const [categories] = await db.pool.query('SELECT id, name_en, name_fr, name_pt FROM categories');
    const [categoriesCountResult] = await db.pool.query('SELECT COUNT(*) as count FROM categories');
    const existingCategories = categories.map(cat => ({
      id: cat.id,
      names: [cat.name_en, cat.name_fr, cat.name_pt].filter(Boolean).map(name => name.toString().trim().toLowerCase())
    }));
    const existingCategoryNames = new Set(existingCategories.flatMap(cat => cat.names));

    const categoryExists = (category) =>
      existingCategoryNames.has(category.name_en.toLowerCase()) ||
      existingCategoryNames.has(category.name_fr.toLowerCase()) ||
      existingCategoryNames.has(category.name_pt.toLowerCase());

    const oldNameMap = {
      'wines': 'Vinhos & Bebidas Tradicionais',
      'vinhos': 'Vinhos & Bebidas Tradicionais',
      'vins': 'Vinhos & Bebidas Tradicionais',
      'groceries': 'Mercearia',
      'épicerie': 'Mercearia',
      'mercearia': 'Mercearia',
      'coffee': 'Café & Chás',
      'café': 'Café & Chás',
      'specialties': 'Promoções',
      'spécialités': 'Promoções',
      'especialidades': 'Promoções'
    };

    const normalizedDesired = defaultCategories.reduce((map, cat) => {
      map[cat.name_en.toLowerCase()] = cat;
      return map;
    }, {});

    if (categoriesCountResult[0].count === 0) {
      for (const cat of defaultCategories) {
        const sql = `INSERT INTO categories (name_en, name_fr, name_pt, icon, description) VALUES (?, ?, ?, ?, ?)`;
        await db.pool.query(sql, [cat.name_en, cat.name_fr, cat.name_pt, cat.icon, cat.description]);
      }
      log(`✓ Seeded ${defaultCategories.length} default categories`);
    } else {
      for (const existing of existingCategories) {
        for (const existingName of existing.names) {
          const mappedName = oldNameMap[existingName];
          if (mappedName && !categoryExists(normalizedDesired[mappedName])) {
            const desired = defaultCategories.find(cat => cat.name_en === mappedName);
            if (desired) {
              await db.pool.query(
                `UPDATE categories SET name_en = ?, name_fr = ?, name_pt = ?, icon = ?, description = ? WHERE id = ?`,
                [desired.name_en, desired.name_fr, desired.name_pt, desired.icon, desired.description, existing.id]
              );
              existingCategoryNames.add(desired.name_en.toLowerCase());
              existingCategoryNames.add(desired.name_fr.toLowerCase());
              existingCategoryNames.add(desired.name_pt.toLowerCase());
              log(`↻ Updated category id=${existing.id} to ${mappedName}`);
            }
            break;
          }
        }
      }

      for (const desired of defaultCategories) {
        if (!categoryExists(desired)) {
          const sql = `INSERT INTO categories (name_en, name_fr, name_pt, icon, description) VALUES (?, ?, ?, ?, ?)`;
          await db.pool.query(sql, [desired.name_en, desired.name_fr, desired.name_pt, desired.icon, desired.description]);
          existingCategoryNames.add(desired.name_en.toLowerCase());
          existingCategoryNames.add(desired.name_fr.toLowerCase());
          existingCategoryNames.add(desired.name_pt.toLowerCase());
          log(`✓ Inserted missing category ${desired.name_en}`);
        }
      }
    }
  } catch (err) {
    warn('Could not seed or normalize categories:', err.message);
  }

  // Seed default roles if table is empty
  try {
    const [roles] = await db.pool.query('SELECT COUNT(*) as count FROM roles');
    if (roles[0].count === 0) {
      const defaultRoles = [
        {
          name: 'User',
          description: 'Standard user with limited access',
          permissions: {
            view_products: true,
            view_categories: true,
            view_profile: true
          }
        },
        {
          name: 'Buyer',
          description: 'Buyer with browse and purchase access',
          permissions: {
            view_products: true,
            view_categories: true,
            view_users: true,
            view_activities: true
          }
        },
        {
          name: 'Seller',
          description: 'Seller with product management access',
          permissions: {
            view_products: true,
            manage_products: true,
            view_categories: true,
            manage_categories: true,
            view_users: true,
            view_activities: true,
            manage_comments: true
          }
        },
        {
          name: 'Admin',
          description: 'Administrator with full access',
          permissions: {
            view_products: true,
            manage_products: true,
            view_categories: true,
            manage_categories: true,
            view_users: true,
            manage_users: true,
            manage_roles: true,
            view_activities: true,
            delete_activities: true,
            system_settings: true,
            manage_comments: true
          }
        }
      ];

      for (const role of defaultRoles) {
        const sql = `INSERT INTO roles (name, description, permissions, active) VALUES (?, ?, ?, ?)`;
        await db.pool.query(sql, [
          role.name,
          role.description,
          JSON.stringify(role.permissions),
          true
        ]);
      }
      log(`✓ Seeded ${defaultRoles.length} default roles`);
    }
  } catch (err) {
    warn('Could not seed roles:', err.message);
  }

  // Seed products from public/products.json if table is empty (minimum 1000 entries)
  try {
    const [products] = await db.pool.query('SELECT COUNT(*) as count FROM products');
    if (products[0].count === 0) {
      const productsFile = path.join(__dirname, '../../public/products.json');
      let data = JSON.parse(fs.readFileSync(productsFile, 'utf8'));

      const MIN_PRODUCTS = 1000;

      if (!Array.isArray(data)) {
        data = [];
      }

      // Get default category ID (first category)
      const [categories] = await db.pool.query('SELECT id FROM categories LIMIT 1');
      const defaultCategoryId = categories.length > 0 ? categories[0].id : 1;

      // If there are fewer than MIN_PRODUCTS, generate extras
      if (data.length < MIN_PRODUCTS) {
        const baseItems = data.length > 0 ? data : [{
          id: 'default-product',
          name_fr: 'Produit par défaut',
          name_pt: 'Produto padrão',
          name_en: 'Default product',
          image: '/images/default.jpg',
          price: 9.99,
          category: 'default',
          description: 'Auto-generated sample product',
          quantity: 100
        }];

        for (let i = data.length; i < MIN_PRODUCTS; i++) {
          const template = baseItems[i % baseItems.length];
          const suffix = i + 1;
          data.push({
            id: `gen-product-${suffix}`,
            name_fr: `${template.name_fr || template.name || 'Produit'} ${suffix}`,
            name_pt: `${template.name_pt || template.name || 'Produto'} ${suffix}`,
            name_en: `${template.name_en || template.name || 'Product'} ${suffix}`,
            image: template.image || '/images/default.jpg',
            price: Number(((template.price || 5) + (suffix % 20) * 0.5).toFixed(2)),
            category: template.category || 'other',
            description: (template.description ? `${template.description} #${suffix}` : `Auto-generated product #${suffix}`),
            quantity: 20 + (suffix % 80)
          });
        }
      }

      for (const product of data) {
        const sql = `INSERT INTO products (name_fr, name_pt, name_en, category_id, user_id, quantity, price, image, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        await db.pool.query(sql, [
          product.name_fr || product.name || '',
          product.name_pt || product.name || '',
          product.name_en || product.name || '',
          product.category_id || defaultCategoryId,
          1,
          Number.isFinite(Number(product.quantity)) ? Number(product.quantity) : 0,
          Number.isFinite(Number(product.price)) ? Number(product.price) : 0,
          product.image || null,
          product.description || null
        ]);
      }

      log(`✓ Seeded ${data.length} products into products table (minimum ${MIN_PRODUCTS})`);
    }
  } catch (err) {
    warn('Could not seed products:', err.message);
  }

  // Migrate existing tables from VARCHAR IDs to INT AUTO_INCREMENT
  try {
    // Check if we need to migrate categories table
    const [categoriesColumns] = await db.pool.query(`SHOW COLUMNS FROM categories`);
    const categoryParentColumn = categoriesColumns.find(col => col.Field === 'parent_id');
    if (!categoryParentColumn) {
      log('↻ Adding parent_id column to categories table...');
      await db.pool.query(`ALTER TABLE categories ADD COLUMN parent_id INT DEFAULT NULL`);
      await db.pool.query(`ALTER TABLE categories ADD INDEX idx_category_parent_id (parent_id)`);
      try {
        await db.pool.query(`ALTER TABLE categories ADD CONSTRAINT fk_category_parent FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL ON UPDATE CASCADE`);
      } catch (err) {
        warn('⚠ Could not add parent_id foreign key constraint:', err.message);
      }
    }

    const categoryIdColumn = categoriesColumns.find(col => col.Field === 'id');
    
    if (categoryIdColumn && categoryIdColumn.Type === 'varchar(255)') {
      log('↻ Migrating categories table to INT AUTO_INCREMENT...');
      
      // Create new table with INT IDs
      const backupTable = `categories_backup_${Date.now()}`;
      await db.pool.query(`CREATE TABLE ${backupTable} LIKE categories`);
      log(`✓ Created backup table: ${backupTable}`);
      
      // Copy data
      await db.pool.query(`INSERT INTO ${backupTable} SELECT * FROM categories`);
      
      // Drop foreign keys that reference categories
      try {
        await db.pool.query(`ALTER TABLE products DROP FOREIGN KEY fk_product_category`);
      } catch (err) {
        // ForeignKey might not exist
      }
      
      // Drop and recreate categories table with INT ID
      await db.pool.query(`DROP TABLE categories`);
      const createCategoriesNewSchema = `
        CREATE TABLE categories (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name_en VARCHAR(255) NOT NULL UNIQUE,
          name_fr VARCHAR(255) NOT NULL,
          name_pt VARCHAR(255) NOT NULL,
          description TEXT DEFAULT NULL,
          icon VARCHAR(10) DEFAULT '📦',
          color VARCHAR(7) DEFAULT '#c41e1e',
          active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          parent_id INT DEFAULT NULL,
          INDEX idx_category_parent_id (parent_id),
          INDEX idx_name_en (name_en),
          INDEX idx_active (active)
        ) ENGINE=InnoDB AUTO_INCREMENT=1;
      `;
      await db.pool.query(createCategoriesNewSchema);
      
      // Copy data back with new IDs
      await db.pool.query(`
        INSERT INTO categories (name_en, name_fr, name_pt, description, icon, color, active, created_at, updated_at)
        SELECT name_en, name_fr, name_pt, description, icon, color, active, created_at, updated_at
        FROM ${backupTable}
      `);
      
      log('✓ Categories table migrated to INT AUTO_INCREMENT');
    }
    
    // Check if we need to migrate users table
    const [usersColumns] = await db.pool.query(`SHOW COLUMNS FROM users`);
    const userIdColumn = usersColumns.find(col => col.Field === 'id');
    
    if (userIdColumn && userIdColumn.Type === 'varchar(255)') {
      log('↻ Migrating users table to INT AUTO_INCREMENT...');
      
      // Create backup
      const backupTable = `users_backup_${Date.now()}`;
      await db.pool.query(`CREATE TABLE ${backupTable} LIKE users`);
      
      // Copy data
      await db.pool.query(`INSERT INTO ${backupTable} SELECT * FROM users`);
      
      // Drop and recreate users table with INT ID
      await db.pool.query(`DROP TABLE users`);
      const createUsersNewSchema = `
        CREATE TABLE users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(100) NOT NULL UNIQUE,
          email VARCHAR(255) UNIQUE DEFAULT NULL,
          password VARCHAR(255) NOT NULL,
          first_name VARCHAR(100) DEFAULT '',
          last_name VARCHAR(100) DEFAULT '',
          phone_number VARCHAR(20) DEFAULT NULL,
          city VARCHAR(100) DEFAULT NULL,
          role VARCHAR(50) DEFAULT 'user',
          active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_username (username),
          INDEX idx_email (email),
          INDEX idx_role (role),
          INDEX idx_active (active)
        ) ENGINE=InnoDB AUTO_INCREMENT=1;
      `;
      await db.pool.query(createUsersNewSchema);
      
      // Copy data back with new IDs
      await db.pool.query(`
        INSERT INTO users (username, email, password, first_name, last_name, phone_number, city, role, active, created_at, updated_at)
        SELECT username, email, password, first_name, last_name, phone_number, city, role, active, created_at, updated_at
        FROM ${backupTable}
      `);
      
      log('✓ Users table migrated to INT AUTO_INCREMENT');
    }
    
    // Check if we need to migrate products table
    const [productsColumns] = await db.pool.query(`SHOW COLUMNS FROM products`);
    const productIdColumn = productsColumns.find(col => col.Field === 'id');
    const productCategoryColumn = productsColumns.find(col => col.Field === 'category_id');
    
    if (productIdColumn && productIdColumn.Type === 'varchar(255)') {
      log('↻ Migrating products table to INT AUTO_INCREMENT...');
      
      // Create backup
      const backupTable = `products_backup_${Date.now()}`;
      await db.pool.query(`CREATE TABLE ${backupTable} LIKE products`);
      
      // Copy data
      try {
        await db.pool.query(`INSERT INTO ${backupTable} SELECT * FROM products`);
      } catch (err) {
        warn('⚠ Could not backup products:', err.message);
      }
      
      // Drop and recreate products table with INT ID
      try {
        await db.pool.query(`DROP TABLE products`);
      } catch (err) {
        warn('⚠ Could not drop products table:', err.message);
      }
      
      const createProductsNewSchema = `
        CREATE TABLE products (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name_fr VARCHAR(255) NOT NULL,
          name_pt VARCHAR(255) NOT NULL,
          name_en VARCHAR(255) NOT NULL,
          category_id INT NOT NULL,
          user_id INT NOT NULL,
          quantity INT NOT NULL DEFAULT 0,
          price DECIMAL(10,2) NOT NULL,
          is_featured BOOLEAN NOT NULL DEFAULT FALSE,
          promo_price DECIMAL(10,2) DEFAULT NULL,
          promo_label VARCHAR(100) DEFAULT NULL,
          promo_expires_at DATETIME DEFAULT NULL,
          image VARCHAR(500) DEFAULT NULL,
          description TEXT DEFAULT NULL,
          rating DECIMAL(2,1) DEFAULT NULL,
          specs JSON DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_category_id (category_id),
          INDEX idx_user_id (user_id),
          INDEX idx_name_en (name_en),
          INDEX idx_is_featured (is_featured),
          INDEX idx_promo_expires_at (promo_expires_at),
          CONSTRAINT fk_product_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT ON UPDATE CASCADE,
          CONSTRAINT fk_product_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
        ) ENGINE=InnoDB AUTO_INCREMENT=1;
      `;
      await db.pool.query(createProductsNewSchema);
      
      // Copy data back
      try {
        await db.pool.query(`
          INSERT INTO products (name_fr, name_pt, name_en, category_id, user_id, quantity, price, image, description, created_at, updated_at)
          SELECT name_fr, name_pt, name_en, category_id, COALESCE(user_id, 1), COALESCE(quantity, 0), price, image, description, created_at, updated_at
          FROM ${backupTable}
        `);
        log('✓ Products table migrated to INT AUTO_INCREMENT');
      } catch (err) {
        warn('⚠ Could not restore products data:', err.message);
      }
    }
    
    // Check if we need to migrate roles table
    const [rolesColumns] = await db.pool.query(`SHOW COLUMNS FROM roles`);
    const roleIdColumn = rolesColumns.find(col => col.Field === 'id');
    
    if (roleIdColumn && roleIdColumn.Type === 'varchar(255)') {
      log('↻ Migrating roles table to INT AUTO_INCREMENT...');
      
      // Create backup
      const backupTable = `roles_backup_${Date.now()}`;
      await db.pool.query(`CREATE TABLE ${backupTable} LIKE roles`);
      
      // Copy data
      await db.pool.query(`INSERT INTO ${backupTable} SELECT * FROM roles`);
      
      // Drop and recreate roles table with INT ID
      await db.pool.query(`DROP TABLE roles`);
      const createRolesNewSchema = `
        CREATE TABLE roles (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100) NOT NULL UNIQUE,
          description TEXT DEFAULT NULL,
          permissions JSON DEFAULT NULL,
          active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_name (name),
          INDEX idx_active (active)
        ) ENGINE=InnoDB AUTO_INCREMENT=1;
      `;
      await db.pool.query(createRolesNewSchema);
      
      // Copy data back with new IDs
      await db.pool.query(`
        INSERT INTO roles (name, description, permissions, active, created_at, updated_at)
        SELECT name, description, permissions, active, created_at, updated_at
        FROM ${backupTable}
      `);
      
      log('✓ Roles table migrated to INT AUTO_INCREMENT');
    }
  } catch (err) {
    warn('⚠ Migration process had issues:', err.message);
  }
}


async function generateUniqueProductSlug(id, source) {
  let base = slugify(source || `product-${id}`);
  if (!base) base = `product-${id}`;
  let slug = base;
  let counter = 1;
  while (true) {
    const [rows] = await db.pool.query(`SELECT id FROM products WHERE slug = ? AND id <> ? LIMIT 1`, [slug, id]);
    if (rows.length === 0) {
      return slug;
    }
    slug = `${base}-${counter}`;
    counter += 1;
  }
}

// Create a proxy object that always returns the current pool
const poolProxy = new Proxy(db, {
  get(target, prop) {
    if (prop === 'query') {
      return target.pool?.query.bind(target.pool);
    }
    return target.pool?.[prop];
  }
});

module.exports = { pool: poolProxy, initDatabase };

