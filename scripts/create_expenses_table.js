const mysql = require('mysql2/promise');

(async () => {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'cabo1990',
      database: 'portugalstore_db',
    });

    // Check if expenses table exists
    const [rows] = await connection.query(`SHOW TABLES LIKE 'expenses'`);
    if (rows.length === 0) {
      console.log('Creating expenses table...');
      await connection.query(`
        CREATE TABLE expenses (
          id INT AUTO_INCREMENT PRIMARY KEY,
          category VARCHAR(100) NOT NULL,
          description TEXT,
          amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
          expense_date DATE NOT NULL,
          created_by INT DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_expenses_category (category),
          INDEX idx_expenses_date (expense_date),
          INDEX idx_expenses_created_by (created_by),
          CONSTRAINT fk_expense_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
        ) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      console.log('✅ Expenses table created successfully.');
    } else {
      console.log('ℹ️ Expenses table already exists.');
    }

    await connection.end();
  } catch (err) {
    console.error('❌ Error creating expenses table:', err.message);
    process.exit(1);
  }
})();