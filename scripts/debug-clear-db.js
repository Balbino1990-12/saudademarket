const db = require('../src/config/database');

(async () => {
  process.env.NODE_ENV = 'test';
  process.env.DB_NAME = 'portugalstore_test';
  await db.initDatabase();
  const pool = global.db.pool;
  const [tables] = await pool.query('SHOW TABLES');
  console.log('TABLES', tables.map((r) => Object.values(r)[0]));
  try {
    await pool.query('SET FOREIGN_KEY_CHECKS = 0');
    await pool.query('TRUNCATE TABLE users');
    console.log('TRUNCATE users OK');
  } catch (err) {
    console.error('TRUNCATE users FAILED', err.message);
  } finally {
    await pool.query('SET FOREIGN_KEY_CHECKS = 1');
  }
  const [count] = await pool.query('SELECT COUNT(*) AS c FROM users');
  console.log('COUNT USERS', count[0].c);
  await pool.end();
})().catch((err) => {
  console.error('ERR', err);
  process.exit(1);
});
