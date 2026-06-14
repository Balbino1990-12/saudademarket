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

    console.log('\n🔧 Updating admin user role...\n');
    
    // Get Admin role ID
    const [adminRole] = await conn.query('SELECT id FROM roles WHERE name = "Admin" LIMIT 1');
    if (adminRole.length === 0) {
      console.error('❌ Admin role not found');
      conn.end();
      return;
    }

    const adminRoleId = adminRole[0].id;
    console.log(`✓ Found Admin role (ID: ${adminRoleId})`);

    // Update admin user to have Admin role
    await conn.query('UPDATE users SET role_id = ? WHERE username = "admin"', [adminRoleId]);
    console.log('✓ Updated admin user to Admin role');

    // Retrieve and display updated admin user
    const [updatedAdmin] = await conn.query(`
      SELECT u.id, u.username, u.email, u.first_name, u.last_name,
             u.role_id, r.name as role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.username = "admin"
    `);

    if (updatedAdmin.length > 0) {
      const admin = updatedAdmin[0];
      console.log('\n📋 Updated Admin User:');
      console.log('───────────────────────');
      console.log(`Username:    ${admin.username}`);
      console.log(`Email:       ${admin.email}`);
      console.log(`Name:        ${admin.first_name} ${admin.last_name}`);
      console.log(`Role:        ${admin.role_name} (ID: ${admin.role_id})`);
      console.log('───────────────────────');
      console.log('\n🔐 Admin Credentials:');
      console.log('───────────────────────');
      console.log('Username: admin');
      console.log('Password: admin123');
      console.log('───────────────────────');
    }

    conn.end();
    console.log('\n✅ Admin user successfully updated!\n');
  } catch(e) {
    console.error('❌ Error:', e.message);
  }
})();

