const mysql = require('mysql2/promise');

(async () => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'portugalstore_db',
    });

    const [rows] = await connection.query(`SHOW COLUMNS FROM orders LIKE 'items'`);
    if (rows.length === 0) {
      await connection.query(`ALTER TABLE orders ADD COLUMN items JSON DEFAULT NULL`);
      console.log('✅ Column items added to orders table.');
    } else {
      console.log('ℹ️ Column items already exists in orders table.');
    }

    await connection.end();
  } catch (err) {
    console.error('❌ Error adding items column to orders table:', err.message);
    process.exit(1);
  }
})();
