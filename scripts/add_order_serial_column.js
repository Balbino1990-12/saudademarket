const mysql = require('mysql2/promise');

(async () => {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'your_database_name',
    });

    const [rows] = await connection.query(`SHOW COLUMNS FROM orders LIKE 'order_serial'`);
    if (rows.length === 0) {
      await connection.query(`ALTER TABLE orders ADD COLUMN order_serial VARCHAR(64) NULL UNIQUE AFTER id`);
      console.log('✅ Column order_serial added to orders table (nullable temporary).');
    } else {
      console.log('ℹ️ Column order_serial already exists in orders table.');
    }

    // Backfill existing orders if no serial already
    const [existingOrders] = await connection.query(`SELECT id, created_at FROM orders WHERE order_serial IS NULL OR order_serial = ''`);
    for (const order of existingOrders) {
      const serial = `ORD${new Date(order.created_at || Date.now()).getTime()}${order.id}`;
      await connection.query(`UPDATE orders SET order_serial = ? WHERE id = ?`, [serial, order.id]);
      console.log(`✅ Backfilled order_serial for order ${order.id} -> ${serial}`);
    }

    // Set to NOT NULL now that rows are filled
    await connection.query(`ALTER TABLE orders MODIFY COLUMN order_serial VARCHAR(64) NOT NULL UNIQUE`);
    console.log('✅ order_serial column set to NOT NULL.');

    await connection.end();
  } catch (err) {
    console.error('❌ Error adding order_serial column to orders table:', err.message);
    process.exit(1);
  }
})();
