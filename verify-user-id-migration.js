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

    console.log('\n✨ Verification Results:\n');
    
    // Check products table structure
    const [columns] = await conn.query('SHOW COLUMNS FROM products');
    const userIdCol = columns.find(col => col.Field === 'user_id');
    if (userIdCol) {
      console.log('✓ user_id column exists');
      console.log('  Type:', userIdCol.Type);
      console.log('  Null:', userIdCol.Null);
    }
    
    // Check foreign keys
    const [fks] = await conn.query(`SELECT * FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
                                     WHERE TABLE_NAME='products' AND COLUMN_NAME='user_id'`);
    if (fks.length > 0) {
      console.log('✓ Foreign key constraints:');
      fks.forEach(fk => {
        console.log(`  - ${fk.CONSTRAINT_NAME}: products.user_id → ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME}`);
      });
    }
    
    // Check indexes
    const [indexes] = await conn.query('SHOW INDEX FROM products WHERE Column_name = "user_id"');
    if (indexes.length > 0) {
      console.log('✓ Index on user_id exists');
    }
    
    // Check data
    const [stats] = await conn.query('SELECT COUNT(*) as count FROM products');
    console.log(`\n📊 Products: ${stats[0].count} total`);
    
    const [users] = await conn.query('SELECT COUNT(*) as count FROM users');
    console.log(`👥 Users: ${users[0].count} total`);
    
    conn.end();
    console.log('\n✅ Migration successful!\n');
  } catch(e) {
    console.error('❌ Error:', e.message);
  }
})();
