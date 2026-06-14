require('dotenv').config();
const mysql = require('mysql2/promise');

async function testPermissions() {
  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'portugalstore_db'
    });

    // Get all roles with their permissions
    const [roles] = await pool.query('SELECT id, name, permissions FROM roles');
    
    console.log('📋 Roles in database:\n');
    roles.forEach(role => {
      console.log(`\nRole: ${role.name} (ID: ${role.id})`);
      console.log('Raw permissions:', role.permissions);
      if (role.permissions) {
        const parsed = typeof role.permissions === 'string' ? JSON.parse(role.permissions) : role.permissions;
        console.log('Parsed permissions:', JSON.stringify(parsed, null, 2));
      }
    });

    // Check if permissions are stored correctly
    console.log('\n✅ Test complete\n');

    await pool.end();
  } catch (err) {
    console.error('❌ Error:', err);
  }
}

testPermissions();

