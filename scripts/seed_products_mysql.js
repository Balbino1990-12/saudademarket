require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  const DB_NAME = process.env.DB_NAME || 'portugalstore_db';
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: DB_NAME,
    multipleStatements: true
  });

  try {
    const [[{count}]] = await connection.query('SELECT COUNT(*) AS count FROM products');
    const MIN_COUNT = 1000;
    if (count >= MIN_COUNT) {
      console.log(`[seed_products_mysql] already has ${count} products, no insertion needed`);
      return;
    }

    console.log(`[seed_products_mysql] currently ${count} products, adding up to ${MIN_COUNT}`);

    // Ensure there is at least one category and one user to satisfy FK constraints
    const [[cat]] = await connection.query('SELECT id FROM categories ORDER BY id LIMIT 1');
    const [[user]] = await connection.query('SELECT id FROM users ORDER BY id LIMIT 1');

    if (!cat || !user) {
      throw new Error('Need at least one category and one user in database before seeding products');
    }

    const defaultCategoryId = cat.id;
    const defaultUserId = user.id;

    const baseNames = [
      'Tradition', 'Classique', 'Rustique', 'Gourmet', 'Premium', 'Deluxe', 'Basique', 'Économique', 'Méditerranée', 'Vicentina'
    ];

    const productImages = [
      '/images/Azeite.jpg',
      '/images/Bacalhau.jpg',
      '/images/Cabazes.jpg',
      '/images/Charcutaria.jpg',
      '/images/Chourico.jpg',
      '/images/Conservas.jpg',
      '/images/Pasteis.jpg',
      '/images/Queijos.jpg',
      '/images/Vinhos_licores.jpg',
      '/images/hero.jpg'
    ];

    const inserts = [];
    for (let i = count + 1; i <= MIN_COUNT; i++) {
      const base = baseNames[(i - 1) % baseNames.length];
      const name = `Product ${i} ${base}`;
      const name_fr = `Produit ${i} ${base}`;
      const name_pt = `Produto ${i} ${base}`;
      const image = productImages[(i - 1) % productImages.length];
      const quantity = 10 + (i % 90);
      const price = Number((5 + (i % 50) * 0.25).toFixed(2));
      const description = `Auto-generated seed product #${i} (${name})`;

      inserts.push([name_fr, name_pt, name, defaultCategoryId, defaultUserId, quantity, price, image, description]);

      if (inserts.length === 100) {
        const sql = 'INSERT INTO products (name_fr,name_pt,name_en,category_id,user_id,quantity,price,image,description) VALUES ?';
        await connection.query(sql, [inserts]);
        inserts.length = 0;
        console.log(`[seed_products_mysql] inserted ${i} rows (batch)`);
      }
    }

    if (inserts.length > 0) {
      const sql = 'INSERT INTO products (name_fr,name_pt,name_en,category_id,user_id,quantity,price,image,description) VALUES ?';
      await connection.query(sql, [inserts]);
      console.log('[seed_products_mysql] inserted final batch', inserts.length);
    }

    const [[{count: finalCount}]] = await connection.query('SELECT COUNT(*) AS count FROM products');
    console.log(`[seed_products_mysql] seeding complete, total products now: ${finalCount}`);
  } catch (e) {
    console.error('[seed_products_mysql] error', e);
    process.exit(1);
  } finally {
    await connection.end();
  }
})();