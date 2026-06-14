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

    console.log('\n📊 Current Users and Roles:\n');
    
    // Check all users with their roles
    const [users] = await conn.query(`
      SELECT u.id, u.username, u.email, u.role_id, r.name as role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      ORDER BY u.id
    `);

    console.log('Users in Database:');
    console.log('─────────────────────────────────────────');
    users.forEach(user => {
      console.log(`ID: ${user.id} | ${user.username.padEnd(20)} | Role: ${user.role_name || 'None'} (ID: ${user.role_id})`);
    });

    // Check admin role
    const [adminRole] = await conn.query('SELECT id, name FROM roles WHERE name = "Admin"');
    if (adminRole.length > 0) {
      console.log(`\n✓ Admin role exists (ID: ${adminRole[0].id})`);
    } else {
      console.log('\n⚠ Admin role NOT found');
    }

    conn.end();
  } catch(e) {
    console.error('❌ Error:', e.message);
  }
})();

