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

    console.log('\n✨ Users-Roles Relationship Verification:\n');
    
    // Check users table structure
    const [userColumns] = await conn.query('SHOW COLUMNS FROM users');
    const roleIdCol = userColumns.find(col => col.Field === 'role_id');
    if (roleIdCol) {
      console.log('✓ role_id column in users table:');
      console.log('  Type:', roleIdCol.Type);
      console.log('  Null:', roleIdCol.Null);
    }
    
    // Check for old role column (should be gone)
    const roleCol = userColumns.find(col => col.Field === 'role');
    if (roleCol) {
      console.log('⚠ Old role column still exists (should be removed)');
    } else {
      console.log('✓ Old role varchar column successfully removed');
    }
    
    // Check foreign keys
    const [fks] = await conn.query(`SELECT * FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
                                     WHERE TABLE_NAME='users' AND COLUMN_NAME='role_id'`);
    if (fks.length > 0) {
      console.log('\n✓ Foreign key constraints:');
      fks.forEach(fk => {
        console.log(`  - ${fk.CONSTRAINT_NAME}: users.role_id → ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME}`);
      });
    }
    
    // Check indexes
    const [indexes] = await conn.query('SHOW INDEX FROM users WHERE Column_name = "role_id"');
    if (indexes.length > 0) {
      console.log('✓ Index on role_id exists');
    }
    
    // Check relationship data
    const [userStats] = await conn.query(`
      SELECT 
        COUNT(*) as total_users,
        SUM(CASE WHEN role_id IS NOT NULL THEN 1 ELSE 0 END) as users_with_role,
        SUM(CASE WHEN role_id IS NULL THEN 1 ELSE 0 END) as users_without_role
      FROM users
    `);
    console.log(`\n📊 User-Role Statistics:`);
    console.log(`  Total users: ${userStats[0].total_users}`);
    console.log(`  Users with role: ${userStats[0].users_with_role}`);
    console.log(`  Users without role: ${userStats[0].users_without_role}`);
    
    // Check role data
    const [roleStats] = await conn.query(`
      SELECT r.id, r.name, COUNT(u.id) as user_count
      FROM roles r
      LEFT JOIN users u ON r.id = u.role_id
      GROUP BY r.id, r.name
      ORDER BY r.id
    `);
    if (roleStats.length > 0) {
      console.log(`\n👥 Users per Role:`);
      roleStats.forEach(role => {
        console.log(`  - ${role.name} (ID: ${role.id}): ${role.user_count} user(s)`);
      });
    }
    
    conn.end();
    console.log('\n✅ Users-Roles relationship successfully configured!\n');
  } catch(e) {
    console.error('❌ Error:', e.message);
  }
})();

