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

    const [[{count}]] = await connection.query('SELECT COUNT(*) as count FROM products');
    console.log(`[update_product_images_real] Found ${count} products to update`);

    if (count === 0) {
      console.log('[update_product_images_real] No products found. Exiting.');
      return;
    }

    // Get all product IDs
    const [products] = await connection.query('SELECT id FROM products ORDER BY id');

    let updated = 0;
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const newImage = productImages[i % productImages.length];

      await connection.query(
        'UPDATE products SET image = ? WHERE id = ?',
        [newImage, product.id]
      );
      updated += 1;

      if ((i + 1) % 100 === 0) {
        console.log(`[update_product_images_real] Updated ${i + 1} products...`);
      }
    }

    console.log(`[update_product_images_real] ✓ Successfully updated ${updated} products with real images`);
  } catch (e) {
    console.error('[update_product_images_real] error:', e.message || e);
    process.exit(1);
  } finally {
    await connection.end();
  }
})();
