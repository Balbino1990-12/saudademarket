require('dotenv').config();
const { initDatabase } = require('./src/config/database');
const Order = require('./src/models/Order');
(async () => {
  try {
    await initDatabase();
    const rows = await Order.getCustomerRepeatSummary({ startDate: '2026-04-26', endDate: '2026-05-02' });
    console.log('OK', rows);
  } catch (err) {
    console.error('ERROR', err);
    if (err.stack) console.error(err.stack);
  }
})();
