const express = require('express');
const router = express.Router();
const ExpenseController = require('../controllers/ExpenseController');
const { verifyAdminSession } = require('../middleware/authentication');

// All expense routes require admin authentication
router.use(verifyAdminSession);

// GET /api/admin/expenses - Get all expenses with optional filters
router.get('/', ExpenseController.getExpenses);

// GET /api/admin/expenses/summary - Get expense summary, trends, and profit/loss
router.get('/summary', ExpenseController.getExpenseSummary);

// GET /api/admin/expenses/profit-loss - Get profit/loss calculation
router.get('/profit-loss', ExpenseController.getProfitLoss);

// GET /api/admin/expenses/:id - Get single expense
router.get('/:id', ExpenseController.getExpenseById);

// POST /api/admin/expenses - Create new expense
router.post('/', ExpenseController.createExpense);

// PUT /api/admin/expenses/:id - Update expense
router.put('/:id', ExpenseController.updateExpense);

// DELETE /api/admin/expenses/:id - Delete expense
router.delete('/:id', ExpenseController.deleteExpense);

module.exports = router;