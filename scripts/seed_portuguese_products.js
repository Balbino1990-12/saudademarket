require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

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
    const [[{categoryCount}]] = await connection.query('SELECT COUNT(*) AS categoryCount FROM categories');
    if (!categoryCount) {
      throw new Error('No categories found. Please seed categories first.');
    }

    const [[{userCount}]] = await connection.query('SELECT COUNT(*) AS userCount FROM users');
    if (!userCount) {
      throw new Error('No users found. Please seed at least one user first.');
    }

    const [[category]] = await connection.query('SELECT id FROM categories ORDER BY id LIMIT 1');
    const [[user]] = await connection.query('SELECT id FROM users ORDER BY id LIMIT 1');
    const categoryId = category.id;
    const userId = user.id;

    const filePath = path.join(__dirname, '../public/products.json');
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!Array.isArray(data)) {
      throw new Error('public/products.json is not an array');
    }

    let inserted = 0;
    for (const p of data) {
      const namePt = p.name_pt || p.name_en || p.name_fr || `Produto ${Date.now()}`;
      const nameFr = p.name_fr || p.name_en || p.name_pt || namePt;
      const nameEn = p.name_en || p.name_fr || p.name_pt || namePt;
      const image = p.image || '/images/default.jpg';
      const price = Number.isFinite(Number(p.price)) ? Number(p.price) : 0;
      const quantity = Number.isFinite(Number(p.quantity)) ? Number(p.quantity) : 10;
      const description = p.description || (p.name_en ? `Produto ${p.name_en}` : `Produto gerado`);

      const [existingRows] = await connection.query(
        'SELECT id FROM products WHERE name_pt = ? OR name_en = ? OR name_fr = ? LIMIT 1',
        [namePt, nameEn, nameFr]
      );

      if (existingRows.length > 0) {
        continue; // skip already existing entry
      }

      const sql = `INSERT INTO products (name_fr, name_pt, name_en, category_id, user_id, quantity, price, image, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      await connection.query(sql, [nameFr, namePt, nameEn, categoryId, userId, quantity, price, image, description]);
      inserted += 1;
    }

    const [[{count}]] = await connection.query('SELECT COUNT(*) as count FROM products');
    const MIN_PRODUCTS = 100;

    if (count < MIN_PRODUCTS) {
      const existingData = data.filter(p => p.name_pt || p.name_en || p.name_fr);
      const currentCount = count;
      for (let i = currentCount + 1; i <= MIN_PRODUCTS; i++) {
        const template = existingData[(i - 1) % existingData.length];
        const namePt = `${template.name_pt || template.name_en || template.name_fr || 'Produto'} ${i}`;
        const nameFr = `${template.name_fr || template.name_en || template.name_pt || 'Produit'} ${i}`;
        const nameEn = `${template.name_en || template.name_fr || template.name_pt || 'Product'} ${i}`;
        const image = template.image || '/images/default.jpg';
        const price = Number.isFinite(Number(template.price)) ? Number(template.price) : 9.99;
        const quantity = 10 + (i % 90);
        const description = template.description ? `${template.description} #${i}` : `Auto-generated Portuguese product #${i}`;

        const sql = `INSERT INTO products (name_fr, name_pt, name_en, category_id, user_id, quantity, price, image, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        await connection.query(sql, [nameFr, namePt, nameEn, categoryId, userId, quantity, price, image, description]);
        inserted += 1;
      }
    }

    const [[{finalCount}]] = await connection.query('SELECT COUNT(*) as finalCount FROM products');
    console.log(`[seed_portuguese_products] inserted ${inserted} new portuguese entries; artifacts now total ${finalCount}`);
  } catch (err) {
    console.error('[seed_portuguese_products] error:', err.message || err);
    process.exit(1);
  } finally {
    await connection.end();
  }
})();