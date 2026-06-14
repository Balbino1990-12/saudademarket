require('dotenv').config();
const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'portugalstore_db',
    charset: 'utf8mb4'
  });

  try {
    console.log('Connected to database:', process.env.DB_NAME || 'portugalstore_db');

    const [typeColumnRows] = await connection.query("SHOW COLUMNS FROM coupons LIKE 'type'");
    if (!typeColumnRows.length) {
      throw new Error('Coupons table or type column not found. Verify the database and table exist.');
    }

    const typeDefinition = typeColumnRows[0].Type;
    console.log('Existing coupons.type definition:', typeDefinition);

    if (!typeDefinition.includes('free_shipping')) {
      console.log('Applying coupons.type enum patch...');
      await connection.query("ALTER TABLE coupons MODIFY COLUMN type ENUM('percent','fixed','free_shipping') NOT NULL DEFAULT 'fixed'");
      console.log('Updated coupons.type enum to include free_shipping.');
    } else {
      console.log('Coupons.type enum already includes free_shipping. No change needed.');
    }

    const [valueColumnRows] = await connection.query("SHOW COLUMNS FROM coupons LIKE 'value'");
    if (!valueColumnRows.length) {
      throw new Error('Coupons table or value column not found. Verify the database and table exist.');
    }

    const valueDefinition = valueColumnRows[0].Type;
    console.log('Existing coupons.value definition:', valueDefinition);

    if (!valueDefinition.toLowerCase().startsWith('decimal(12,2)')) {
      console.log('Applying coupons.value column patch...');
      await connection.query('ALTER TABLE coupons MODIFY COLUMN value DECIMAL(12,2) NOT NULL DEFAULT 0.00');
      console.log('Updated coupons.value column to DECIMAL(12,2).');
    } else {
      console.log('Coupons.value column already uses DECIMAL(12,2). No change needed.');
    }

    console.log('Schema patch completed successfully.');
  } catch (error) {
    console.error('Schema patch failed:', error.message);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

run();
