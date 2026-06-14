const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'portugalstore_db'
    });

    console.log('\n📊 Database Check:\n');
    
    // Check products
    const [products] = await conn.query('SELECT COUNT(*) as count, MIN(user_id) as min_user_id, MAX(user_id) as max_user_id FROM products');
    console.log('Products:', products[0]);
    
    // Check users
    const [users] = await conn.query('SELECT id FROM users ORDER BY id');
    console.log('User IDs:', users.map(u => u.id));
    
    // Check for orphaned products
    const [orphaned] = await conn.query(`
      SELECT COUNT(*) as count FROM products p
      WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = p.user_id)
    `);
    console.log('Orphaned products (no valid user):', orphaned[0].count);
    
    conn.end();
  } catch(e) {
    console.error('Error:', e.message);
  }
})();

