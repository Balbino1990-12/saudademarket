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

    console.log('🔧 Creating default user for orphaned products...\n');
    
    // Create a default admin user with id 1 if it doesn't exist
    try {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 10);

      await conn.query(`
        INSERT INTO users (id, username, email, password, first_name, last_name)
        VALUES (1, 'admin', 'admin@store.fr', ?, 'Admin', 'User')
      `, [hashedPassword]);
      console.log('✓ Created default admin user (id: 1)');
    } catch (err) {
      if (err.message.includes('Duplicate entry')) {
        console.log('✓ Admin user already exists');
      } else {
        throw err;
      }
    }
    
    conn.end();
  } catch(e) {
    console.error('❌ Error:', e.message);
  }
})();

