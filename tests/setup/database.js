const mysql = require('mysql2/promise');

// Test database configuration
const TEST_DB_NAME = 'portugalstore_test';

// Store the original DB name to restore later
let originalDbName;

/**
 * Connect to test database and initialize schema
 */
async function connect() {
  // Store original DB name
  originalDbName = process.env.DB_NAME;

  // Set test database name
  process.env.DB_NAME = TEST_DB_NAME;

  // Import and initialize database after setting env
  const db = require('../../src/config/database');
  global.db = db;

  try {
    // Initialize the test database
    await db.initDatabase();
    console.log('✓ Test database initialized');
  } catch (err) {
    console.error('✗ Test database initialization failed:', err.message);
    throw err;
  }
}

/**
 * Close database connection
 */
async function closeDatabase() {
  // Restore original DB name
  if (originalDbName) {
    process.env.DB_NAME = originalDbName;
  }

  // Close the pool if it exists
  if (global.db && global.db.pool) {
    await global.db.pool.end();
  }
}

/**
 * Clear all test data by truncating tables
 */
async function clearDatabase() {
  if (!global.db || !global.db.pool) {
    return;
  }

  const tables = [
    'cart',
    'products',
    'users',
    'categories',
    'orders',
    'order_items',
    'comments',
    'specialists',
    'specialties',
    'activities',
    'analytics_events'
  ];

  try {
    await global.db.pool.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const table of tables) {
      try {
        await global.db.pool.query(`TRUNCATE TABLE ${table}`);
      } catch (err) {
        try {
          await global.db.pool.query(`DELETE FROM ${table}`);
        } catch (deleteErr) {
          console.log(`Table ${table} not found or already cleared`);
        }
      }
    }
    await global.db.pool.query('SET FOREIGN_KEY_CHECKS = 1');
  } catch (err) {
    try {
      await global.db.pool.query('SET FOREIGN_KEY_CHECKS = 1');
    } catch (restoreErr) {
      // ignore
    }
    throw err;
  }
}

module.exports = {
  connect,
  closeDatabase,
  clearDatabase,
};