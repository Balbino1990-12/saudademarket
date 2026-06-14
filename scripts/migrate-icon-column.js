/**
 * Migration script to update the categories table icon column
 * from VARCHAR(10) to VARCHAR(500) to support file paths
 * 
 * Run: node scripts/migrate-icon-column.js
 */

require('dotenv').config();
const { initDatabase, pool } = require('../src/config/database');

async function migrate() {
  try {
    console.log('🔄 Starting migration: Updating icon column...');
    
    // Initialize database first
    await initDatabase();
    console.log('✅ Database initialized');
    
    // Now pool should be available
    // Check if column exists and its current length
    const [[{ COLUMN_TYPE }]] = await pool.query(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'categories' 
      AND COLUMN_NAME = 'icon'
      AND TABLE_SCHEMA = DATABASE()
    `);
    
    const currentType = COLUMN_TYPE;
    console.log(`📋 Current icon column type: ${currentType}`);
    
    // Only alter if it's the small VARCHAR(10)
    if (currentType === 'varchar(10)') {
      console.log('🔧 Altering icon column to VARCHAR(500)...');
      await pool.query(`
        ALTER TABLE categories 
        MODIFY icon VARCHAR(500) DEFAULT '📦'
      `);
      console.log('✅ Migration successful! Icon column updated to VARCHAR(500)');
    } else if (currentType === 'varchar(500)') {
      console.log('✅ Icon column is already VARCHAR(500)');
    } else {
      console.log(`ℹ️  Icon column type is ${currentType}, no change needed`);
    }
    process.exit(0);
    
  } catch (err) {
    console.error('❌ Migration error:', err.message);
    process.exit(1);
  }
}

migrate();
