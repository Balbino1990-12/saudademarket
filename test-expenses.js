// Test script for expense tracking functionality
const { initDatabase } = require('./src/config/database');
const Expense = require('./src/models/Expense');

async function testExpenses() {
  try {
    console.log('Initializing database...');
    await initDatabase();
    console.log('Database initialized.');

    console.log('Testing Expense Model...');

    // Test creating an expense
    console.log('Creating test expense...');
    const expense = await Expense.create({
      category: 'marketing',
      description: 'Google Ads campaign',
      amount: 150.50,
      expenseDate: '2024-01-15',
      createdBy: 1
    });
    console.log('Created expense:', expense);

    // Test getting all expenses
    console.log('Getting all expenses...');
    const expenses = await Expense.findAll();
    console.log('All expenses:', expenses);

    // Test getting total expenses
    console.log('Getting total expenses...');
    const total = await Expense.getTotalExpenses();
    console.log('Total expenses:', total);

    // Test getting expenses by category
    console.log('Getting expenses by category...');
    const byCategory = await Expense.getExpensesByCategory();
    console.log('Expenses by category:', byCategory);

    // Test profit/loss calculation
    console.log('Getting profit/loss...');
    const profitLoss = await Expense.getProfitLoss();
    console.log('Profit/Loss:', profitLoss);

    console.log('All tests passed!');

  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testExpenses();
}

module.exports = { testExpenses };