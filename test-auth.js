const User = require('./src/models/User');
const Admin = require('./src/models/Admin');
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

(async () => {
  try {
    console.log('\n🔐 Testing Admin Authentication:\n');
    
    // First, check the database directly
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'portugalstore_db'
    });

    const [dbUser] = await conn.query(`
      SELECT u.id, u.username, u.email, u.password, u.role_id, r.name as role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.username = 'admin'
    `);

    if (dbUser.length === 0) {
      console.error('❌ Admin user not found in database');
      conn.end();
      return;
    }

    const admin = dbUser[0];
    console.log('📋 Admin User from Database:');
    console.log('───────────────────────');
    console.log(`Username:   ${admin.username}`);
    console.log(`Email:      ${admin.email}`);
    console.log(`Role:       ${admin.role_name} (ID: ${admin.role_id})`);
    console.log(`Password hash exists: ${admin.password ? 'Yes' : 'No'}`);
    console.log('───────────────────────');

    // Test password verification
    console.log('\n🔑 Testing Password Verification:');
    console.log('───────────────────────');
    const testPassword = 'admin123';
    const isValid = await bcrypt.compare(testPassword, admin.password);
    console.log(`Test password: ${testPassword}`);
    console.log(`Password valid: ${isValid ? '✓ Yes' : '✗ No'}`);
    console.log('───────────────────────');

    // Now test the getByUsername method
    console.log('\n📨 Testing User.getByUsername Method:');
    console.log('───────────────────────');
    const userFromMethod = await User.getByUsername('admin');
    console.log(`User found: ${userFromMethod ? 'Yes' : 'No'}`);
    if (userFromMethod) {
      console.log(`Username: ${userFromMethod.username}`);
      console.log(`Role name: ${userFromMethod.role_name || 'None'}`);
    }
    console.log('───────────────────────');

    // Test the authenticate method
    console.log('\n🔐 Testing Admin.authenticate Method:');
    console.log('───────────────────────');
    const authResult = await Admin.authenticate('admin', 'admin123');
    console.log(`Authentication result: ${authResult ? '✓ Success' : '✗ Failed'}`);
    if (authResult) {
      console.log(`Returned user: ${authResult.username}`);
      console.log(`Role: ${authResult.role_name}`);
    }
    console.log('───────────────────────');

    conn.end();
    console.log('\n✅ Authentication test complete!\n');
  } catch(e) {
    console.error('❌ Error:', e.message);
    console.error(e);
  }
})();

