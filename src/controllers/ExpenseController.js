const Expense = require('../models/Expense');

class ExpenseController {
  static async createExpense(req, res, next) {
    try {
      const { category, description, amount, expenseDate } = req.body;

      if (!category || !amount || !expenseDate) {
        return res.status(400).json({
          success: false,
          error: 'Category, amount, and expense date are required'
        });
      }

      if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Amount must be a positive number'
        });
      }

      const expense = await Expense.create({
        category,
        description: description || '',
        amount: parseFloat(amount),
        expenseDate,
        createdBy: req.user?.id || null
      });

      res.status(201).json({
        success: true,
        data: expense
      });
    } catch (err) {
      console.error('[ExpenseController.createExpense] Error:', err);
      next(err);
    }
  }

  static async getExpenses(req, res, next) {
    try {
      const filters = {
        category: req.query.category,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        limit: req.query.limit ? parseInt(req.query.limit) : null
      };

      const expenses = await Expense.findAll(filters);

      res.json({
        success: true,
        data: expenses
      });
    } catch (err) {
      console.error('[ExpenseController.getExpenses] Error:', err);
      next(err);
    }
  }

  static async getExpenseById(req, res, next) {
    try {
      const { id } = req.params;
      const expense = await Expense.findById(id);

      if (!expense) {
        return res.status(404).json({
          success: false,
          error: 'Expense not found'
        });
      }

      res.json({
        success: true,
        data: expense
      });
    } catch (err) {
      console.error('[ExpenseController.getExpenseById] Error:', err);
      next(err);
    }
  }

  static async updateExpense(req, res, next) {
    try {
      const { id } = req.params;
      const { category, description, amount, expenseDate } = req.body;

      if (!category || !amount || !expenseDate) {
        return res.status(400).json({
          success: false,
          error: 'Category, amount, and expense date are required'
        });
      }

      if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Amount must be a positive number'
        });
      }

      const expense = await Expense.update(id, {
        category,
        description: description || '',
        amount: parseFloat(amount),
        expenseDate
      });

      if (!expense) {
        return res.status(404).json({
          success: false,
          error: 'Expense not found'
        });
      }

      res.json({
        success: true,
        data: expense
      });
    } catch (err) {
      console.error('[ExpenseController.updateExpense] Error:', err);
      next(err);
    }
  }

  static async deleteExpense(req, res, next) {
    try {
      const { id } = req.params;
      const expense = await Expense.findById(id);

      if (!expense) {
        return res.status(404).json({
          success: false,
          error: 'Expense not found'
        });
      }

      await Expense.delete(id);

      res.json({
        success: true,
        message: 'Expense deleted successfully'
      });
    } catch (err) {
      console.error('[ExpenseController.deleteExpense] Error:', err);
      next(err);
    }
  }

  static async getExpenseSummary(req, res, next) {
    try {
      const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      const [totalExpenses, expensesByCategory, expenseTrend, profitLoss] = await Promise.all([
        Expense.getTotalExpenses(filters),
        Expense.getExpensesByCategory(filters),
        Expense.getExpenseTrend(filters),
        Expense.getProfitLoss(filters)
      ]);

      res.json({
        success: true,
        data: {
          totalExpenses,
          expensesByCategory,
          expenseTrend,
          profitLoss
        }
      });
    } catch (err) {
      console.error('[ExpenseController.getExpenseSummary] Error:', err);
      next(err);
    }
  }

  static async getProfitLoss(req, res, next) {
    try {
      const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      const profitLoss = await Expense.getProfitLoss(filters);

      res.json({
        success: true,
        data: profitLoss
      });
    } catch (err) {
      console.error('[ExpenseController.getProfitLoss] Error:', err);
      next(err);
    }
  }
}

module.exports = ExpenseController;