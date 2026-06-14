const Order = require('../models/Order');
const ReportScheduler = require('../services/ReportScheduler');
const Expense = require('../models/Expense');
// const ExcelJS = require('exceljs');
// const PDFDocument = require('pdfkit');

class ReportController {
  static parseFilters(req) {
    const filters = {
      startDate: req.query.startDate || null,
      endDate: req.query.endDate || null,
      status: req.query.status || null,
      paymentStatus: req.query.paymentStatus || null,
      categoryId: req.query.categoryId ? Number(req.query.categoryId) : null,
      sellerId: req.query.sellerId ? Number(req.query.sellerId) : null,
      limit: req.query.limit ? Number(req.query.limit) : 100,
      offset: req.query.offset ? Number(req.query.offset) : 0
    };

    if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) {
      throw new Error('startDate must be earlier than endDate');
    }

    return filters;
  }

  static async getReports(req, res, next) {
    try {
      const filters = ReportController.parseFilters(req);
      const [orders, revenueByProduct, revenueByCategory, revenueTrend, customerLifetime, repeatSummary, expenseSummary] = await Promise.all([
        Order.getReport(filters),
        Order.getRevenueByProduct(filters),
        Order.getRevenueByCategory(filters),
        Order.getRevenueTrend(filters),
        Order.getCustomerLifetimeValue(filters),
        Order.getCustomerRepeatSummary(filters),
        Expense.getExpenseSummary(filters)
      ]);

      res.json({
        success: true,
        data: {
          orders,
          revenueByProduct,
          revenueByCategory,
          revenueTrend,
          customerLifetime,
          repeatSummary,
          expenseSummary
        }
      });
    } catch (err) {
      console.error('[ReportController.getReports] Error:', err);
      next(err);
    }
  }

  static async exportReport(req, res, next) {
    try {
      const filters = ReportController.parseFilters(req);
      const format = (req.query.format || 'csv').toLowerCase();
      const orders = await Order.getReport({ ...filters, limit: 500 });

      if (format === 'excel') {
        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Orders Report');
        sheet.columns = [
          { header: 'Order ID', key: 'id', width: 10 },
          { header: 'Order Serial', key: 'order_serial', width: 25 },
          { header: 'Buyer', key: 'buyer', width: 30 },
          { header: 'Email', key: 'email', width: 30 },
          { header: 'Status', key: 'status', width: 15 },
          { header: 'Shipping Status', key: 'shipping_status', width: 15 },
          { header: 'Payment Status', key: 'payment_status', width: 15 },
          { header: 'Total', key: 'total', width: 15 },
          { header: 'Created At', key: 'created_at', width: 25 },
          { header: 'Item Count', key: 'item_count', width: 12 }
        ];

        orders.forEach(order => {
          sheet.addRow({
            ...order,
            buyer: order.username || '',
            total: parseFloat(order.total || 0).toFixed(2)
          });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="orders-report.xlsx"');
        await workbook.xlsx.write(res);
        res.end();
        return;
      }

      if (format === 'pdf') {
        const PDFDocument = require('pdfkit');
        const doc = new PDFDocument({ size: 'A4', margin: 40 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="orders-report.pdf"');
        doc.pipe(res);

        doc.fontSize(18).text('Orders Report', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).text(`Generated: ${new Date().toISOString()}`);
        doc.moveDown(0.5);

        orders.slice(0, 40).forEach(order => {
          doc.fontSize(10).fillColor('#333').text(`Order #${order.order_serial} | Buyer: ${order.username || 'N/A'} | Total: €${parseFloat(order.total || 0).toFixed(2)} | Status: ${order.status} | Payment: ${order.payment_status || 'N/A'}`);
        });

        if (orders.length > 40) {
          doc.addPage();
          doc.fontSize(10).text(`Showing 40 of ${orders.length} results`);
        }

        doc.end();
        return;
      }

      // Default CSV
      const columns = ['id', 'order_serial', 'username', 'email', 'status', 'shipping_status', 'payment_status', 'total', 'created_at', 'item_count'];
      const csvRows = [columns.join(',')];
      orders.forEach(order => {
        const line = columns.map(col => {
          let value = order[col] !== undefined && order[col] !== null ? String(order[col]) : '';
          value = value.replace(/"/g, '""');
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            value = `"${value}"`;
          }
          return value;
        }).join(',');
        csvRows.push(line);
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="orders-report.csv"');
      res.send(csvRows.join('\n'));
    } catch (err) {
      console.error('[ReportController.exportReport] Error:', err);
      next(err);
    }
  }

  static async scheduleReport(req, res, next) {
    try {
      const { name, frequency, format = 'csv', filters = {} } = req.body;
      if (!name || !frequency) {
        return res.status(400).json({ success: false, message: 'name and frequency are required' });
      }

      const schedule = await ReportScheduler.saveSchedule({ name, frequency, format, filters });
      res.json({ success: true, data: schedule });
    } catch (err) {
      console.error('[ReportController.scheduleReport] Error:', err);
      next(err);
    }
  }

  static async listScheduledReports(req, res, next) {
    try {
      const schedules = await ReportScheduler.getSchedules();
      res.json({ success: true, data: schedules });
    } catch (err) {
      console.error('[ReportController.listScheduledReports] Error:', err);
      next(err);
    }
  }
}

module.exports = ReportController;
