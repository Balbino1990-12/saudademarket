const { initDatabase, pool } = require('../src/config/database');

async function clearAllCarts() {
  try {
    await initDatabase();
    const [result] = await pool.query('DELETE FROM cart');
    console.log(`Cleared ${result.affectedRows} cart rows for all users.`);
  } catch (error) {
    console.error('Error clearing carts:', error);
    process.exit(1);
  } finally {
    if (pool) await pool.end();
  }
}

(async () => {
  await clearAllCarts();
  process.exit(0);
})();
