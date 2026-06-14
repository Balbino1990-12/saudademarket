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

    console.log('🔧 Cleaning up old role column...\n');
    
    // Check if role column exists
    const [columns] = await conn.query('SHOW COLUMNS FROM users WHERE Field = "role"');
    if (columns.length > 0) {
      console.log('↻ Dropping old role varchar column...');
      try {
        await conn.query('ALTER TABLE users DROP COLUMN role');
        console.log('✓ Successfully dropped old role column');
      } catch (err) {
        console.log('⚠ Could not drop role column:', err.message);
      }
    } else {
      console.log('✓ Old role column already removed');
    }
    
    // Assign default role to users without role
    const [usersWithoutRole] = await conn.query('SELECT COUNT(*) as count FROM users WHERE role_id IS NULL');
    if (usersWithoutRole[0].count > 0) {
      console.log(`\n↻ Assigning default role to ${usersWithoutRole[0].count} users...`);
      // Assign "User" role (ID 1) as default
      await conn.query('UPDATE users SET role_id = 1 WHERE role_id IS NULL');
      console.log('✓ Default role assigned');
    }
    
    conn.end();
    console.log('\n✅ Cleanup complete!\n');
  } catch(e) {
    console.error('❌ Error:', e.message);
  }
})();

