const { pool } = require('../config/database');

class Expense {
  static async create({ category, description, amount, expenseDate, createdBy = null }) {
    try {
      const sql = `INSERT INTO expenses (category, description, amount, expense_date, created_by, created_at) VALUES (?, ?, ?, ?, ?, NOW())`;
      const [result] = await pool.query(sql, [category, description, amount, expenseDate, createdBy]);
      const expenseId = result.insertId;

      return {
        id: expenseId,
        category,
        description,
        amount: parseFloat(amount),
        expense_date: expenseDate,
        created_by: createdBy
      };
    } catch (err) {
      console.error('[Expense.create] Error:', err);
      throw err;
    }
  }

  static async findById(id) {
    try {
      const sql = `SELECT * FROM expenses WHERE id = ?`;
      const [rows] = await pool.query(sql, [id]);
      return rows[0] || null;
    } catch (err) {
      console.error('[Expense.findById] Error:', err);
      throw err;
    }
  }

  static async findAll(filters = {}) {
    try {
      let sql = `SELECT e.*, u.username as creator_username FROM expenses e LEFT JOIN users u ON e.created_by = u.id`;
      const params = [];
      const conditions = [];

      if (filters.category) {
        conditions.push('e.category = ?');
        params.push(filters.category);
      }

      if (filters.startDate) {
        conditions.push('e.expense_date >= ?');
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        conditions.push('e.expense_date <= ?');
        params.push(filters.endDate);
      }

      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }

      sql += ' ORDER BY e.expense_date DESC, e.created_at DESC';

      if (filters.limit) {
        sql += ' LIMIT ?';
        params.push(filters.limit);
      }

      const [rows] = await pool.query(sql, params);
      return rows.map(row => ({
        ...row,
        amount: parseFloat(row.amount)
      }));
    } catch (err) {
      console.error('[Expense.findAll] Error:', err);
      throw err;
    }
  }

  static async update(id, { category, description, amount, expenseDate }) {
    try {
      const sql = `UPDATE expenses SET category = ?, description = ?, amount = ?, expense_date = ?, updated_at = NOW() WHERE id = ?`;
      await pool.query(sql, [category, description, amount, expenseDate, id]);

      return await this.findById(id);
    } catch (err) {
      console.error('[Expense.update] Error:', err);
      throw err;
    }
  }

  static async delete(id) {
    try {
      const sql = `DELETE FROM expenses WHERE id = ?`;
      await pool.query(sql, [id]);
      return true;
    } catch (err) {
      console.error('[Expense.delete] Error:', err);
      throw err;
    }
  }

  static async getTotalExpenses(filters = {}) {
    try {
      let sql = `SELECT SUM(amount) as total FROM expenses`;
      const params = [];
      const conditions = [];

      if (filters.category) {
        conditions.push('category = ?');
        params.push(filters.category);
      }

      if (filters.startDate) {
        conditions.push('expense_date >= ?');
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        conditions.push('expense_date <= ?');
        params.push(filters.endDate);
      }

      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }

      const [result] = await pool.query(sql, params);
      return parseFloat(result[0]?.total || 0);
    } catch (err) {
      console.error('[Expense.getTotalExpenses] Error:', err);
      throw err;
    }
  }

  static async getExpensesByCategory(filters = {}) {
    try {
      let sql = `SELECT category, SUM(amount) as total_amount, COUNT(*) as count FROM expenses`;
      const params = [];
      const conditions = [];

      if (filters.startDate) {
        conditions.push('expense_date >= ?');
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        conditions.push('expense_date <= ?');
        params.push(filters.endDate);
      }

      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }

      sql += ' GROUP BY category ORDER BY total_amount DESC';

      const [rows] = await pool.query(sql, params);
      return rows.map(row => ({
        category: row.category,
        total_amount: parseFloat(row.total_amount),
        count: Number(row.count)
      }));
    } catch (err) {
      console.error('[Expense.getExpensesByCategory] Error:', err);
      throw err;
    }
  }

  static async getExpenseTrend(filters = {}) {
    try {
      let sql = `SELECT DATE(expense_date) as period, SUM(amount) as total_expenses, COUNT(*) as expense_count FROM expenses`;
      const params = [];
      const conditions = [];

      if (filters.category) {
        conditions.push('category = ?');
        params.push(filters.category);
      }

      if (filters.startDate) {
        conditions.push('expense_date >= ?');
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        conditions.push('expense_date <= ?');
        params.push(filters.endDate);
      }

      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }

      sql += ' GROUP BY DATE(expense_date) ORDER BY period ASC';

      const [rows] = await pool.query(sql, params);
      return rows.map(row => ({
        period: row.period,
        total_expenses: parseFloat(row.total_expenses),
        expense_count: Number(row.expense_count)
      }));
    } catch (err) {
      console.error('[Expense.getExpenseTrend] Error:', err);
      throw err;
    }
  }

  static async getProfitLoss(filters = {}) {
    try {
      const Order = require('./Order');

      const [totalRevenue, totalExpenses] = await Promise.all([
        Order.getTotalSales(filters),
        this.getTotalExpenses(filters)
      ]);

      const profit = totalRevenue - totalExpenses;

      return {
        total_revenue: parseFloat(totalRevenue),
        total_expenses: parseFloat(totalExpenses),
        profit: parseFloat(profit),
        profit_margin: totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0
      };
    } catch (err) {
      console.error('[Expense.getProfitLoss] Error:', err);
      throw err;
    }
  }

  static async getExpenseSummary(filters = {}) {
    try {
      const [totalExpenses, expensesByCategory, expenseTrend] = await Promise.all([
        this.getTotalExpenses(filters),
        this.getExpensesByCategory(filters),
        this.getExpenseTrend(filters)
      ]);

      const expenseCount = expensesByCategory.reduce((sum, item) => sum + item.count, 0);
      const averageExpense = expenseCount > 0 ? totalExpenses / expenseCount : 0;

      return {
        total_expenses: parseFloat(totalExpenses),
        expense_count: expenseCount,
        average_expense: parseFloat(averageExpense),
        by_category: expensesByCategory,
        trend: expenseTrend
      };
    } catch (err) {
      console.error('[Expense.getExpenseSummary] Error:', err);
      throw err;
    }
  }
}

module.exports = Expense;