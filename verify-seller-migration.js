const mysql = require('mysql2/promise');

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'cabo1990',
      database: 'portugalstore_db'
    });

    // Check products table structure
    const [products] = await conn.query('SHOW COLUMNS FROM products');
    console.log('\n✓ Products table structure:');
    products.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type}${col.Key ? ` (${col.Key})` : ''}`);
    });

    // Check if seller_id column exists
    const sellerIdCol = products.find(col => col.Field === 'seller_id');
    console.log(`\n${sellerIdCol ? '✓' : '✗'} seller_id column: ${sellerIdCol ? 'EXISTS' : 'MISSING'}`);

    // Check foreign keys
    const [fks] = await conn.query(`
      SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME 
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_NAME = 'products' 
      AND REFERENCED_TABLE_NAME IS NOT NULL
    `);
    
    console.log('\n✓ Foreign Keys:');
    fks.forEach(fk => {
      console.log(`  - ${fk.CONSTRAINT_NAME}: ${fk.COLUMN_NAME} -> ${fk.REFERENCED_TABLE_NAME}`);
    });

    conn.end();
    console.log('\n✓ Verification complete!');
  } catch (err) {
    console.error('✗ Error:', err.message);
    process.exit(1);
  }
})();

