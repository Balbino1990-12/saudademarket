require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkAdminPermissions() {
  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'portugalstore_db'
    });

    console.log('🔍 Checking Admin User Permissions\n');

    // Get admin user info
    const [adminUsers] = await pool.query(`
      SELECT u.*, r.name as role_name, r.permissions 
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.username = 'admin'
    `);

    if (adminUsers.length === 0) {
      console.error('❌ Admin user not found in users table');
      await pool.end();
      return;
    }

    const admin = adminUsers[0];
    console.log('Admin User Found:');
    console.log(`  ID: ${admin.id}`);
    console.log(`  Username: ${admin.username}`);
    console.log(`  Role: ${admin.role_name}`);
    console.log(`  Role ID: ${admin.role_id}\n`);

    if (!admin.role_id) {
      console.error('❌ Admin user has NO assigned role!');
      console.log('This will cause permission checks to fail.\n');
    } else {
      console.log('✅ Admin user has role assigned\n');
    }

    console.log('Admin Role Permissions:');
    const permissions = admin.permissions;
    if (permissions) {
      const parsed = typeof permissions === 'string' ? JSON.parse(permissions) : permissions;
      Object.entries(parsed).forEach(([perm, val]) => {
        const icon = val ? '✓' : '✗';
        console.log(`  ${icon} ${perm}`);
        if (perm === 'manage_roles') {
          if (!val) console.log('     ⚠️  WARNING: Admin lacks manage_roles permission!');
        }
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Admin user verification complete');
    console.log('='.repeat(60));

    await pool.end();
  } catch (err) {
    console.error('❌ Error:', err);
  }
}

checkAdminPermissions();
