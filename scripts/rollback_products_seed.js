require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  const DB_NAME = process.env.DB_NAME || 'portugalstore_db';
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: DB_NAME
  });

  try {
    console.log('[rollback_products_seed] rolling back seeded products, keeping only natural data');

    const deleteSql = `DELETE FROM products
      WHERE name_en LIKE 'Product %'
      OR name_fr LIKE 'Produit %'
      OR name_pt LIKE 'Produto %'
      OR id IN (
        SELECT id FROM (
          SELECT id FROM products WHERE description LIKE 'Auto-generated seed product %' LIMIT 10000
        ) AS tmp
      )`;

    const [result] = await connection.query(deleteSql);
    console.log(`[rollback_products_seed] deleted ${result.affectedRows} seeded rows`);

    const [[{count}]] = await connection.query('SELECT COUNT(*) AS count FROM products');
    console.log(`[rollback_products_seed] remaining products count: ${count}`);
  } catch (err) {
    console.error('[rollback_products_seed] error', err.message || err);
    process.exit(1);
  } finally {
    await connection.end();
  }
})();
