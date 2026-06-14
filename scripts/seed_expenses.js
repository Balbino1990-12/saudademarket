const mysql = require('mysql2/promise');

(async () => {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'cabo1990',
      database: 'portugalstore_db',
    });

    // Check if there are any expenses already
    const [existing] = await connection.query(`SELECT COUNT(*) as count FROM expenses`);
    if (existing[0].count > 0) {
      console.log('ℹ️ Expenses already exist in the database.');
      await connection.end();
      return;
    }

    console.log('Adding sample expenses...');

    // Add some sample expenses
    const sampleExpenses = [
      { category: 'cogs', description: 'Cost of goods sold - Wine purchases', amount: 2500.00, expense_date: '2024-12-01' },
      { category: 'shipping', description: 'Shipping supplies and packaging', amount: 300.00, expense_date: '2024-12-01' },
      { category: 'marketing', description: 'Google Ads campaign', amount: 500.00, expense_date: '2024-12-01' },
      { category: 'rent', description: 'Monthly warehouse rent', amount: 800.00, expense_date: '2024-12-01' },
      { category: 'utilities', description: 'Electricity and water bills', amount: 150.00, expense_date: '2024-12-01' },
      { category: 'salaries', description: 'Staff salaries', amount: 2000.00, expense_date: '2024-12-01' },
      { category: 'cogs', description: 'Cost of goods sold - Cheese and specialty foods', amount: 1200.00, expense_date: '2024-12-15' },
      { category: 'shipping', description: 'Courier services', amount: 200.00, expense_date: '2024-12-15' },
      { category: 'marketing', description: 'Social media advertising', amount: 300.00, expense_date: '2024-12-15' }
    ];

    for (const expense of sampleExpenses) {
      await connection.query(
        `INSERT INTO expenses (category, description, amount, expense_date, created_at) VALUES (?, ?, ?, ?, NOW())`,
        [expense.category, expense.description, expense.amount, expense.expense_date]
      );
      console.log(`✅ Added expense: ${expense.category} - €${expense.amount}`);
    }

    console.log('✅ Sample expenses added successfully.');
    await connection.end();
  } catch (err) {
    console.error('❌ Error adding sample expenses:', err.message);
    process.exit(1);
  }
})();