const mysql = require('mysql2/promise');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

// read database credentials from environment variables
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'portugalstore_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function initDatabase() {
    // create tables if they don't exist
    const createProducts = `
        CREATE TABLE IF NOT EXISTS products (
            id VARCHAR(255) PRIMARY KEY,
            name_fr VARCHAR(255) NOT NULL,
            name_pt VARCHAR(255) NOT NULL,
            name_en VARCHAR(255) NOT NULL,
            category VARCHAR(100) NOT NULL,
            price DECIMAL(10,2) NOT NULL,
            image VARCHAR(500) DEFAULT NULL,
            description TEXT DEFAULT NULL
        ) ENGINE=InnoDB;
    `;
    const createAdmins = `
        CREATE TABLE IF NOT EXISTS admins (
            username VARCHAR(100) PRIMARY KEY,
            password VARCHAR(255) NOT NULL,
            email VARCHAR(255)
        ) ENGINE=InnoDB;
    `;
    await pool.query(createProducts);
    await pool.query(createAdmins);

    // Seed products from public/products.json if table is empty
    try {
        const [products] = await pool.query('SELECT COUNT(*) as count FROM products');
        if (products[0].count === 0) {
            const productsFile = path.join(__dirname, '../../public/products.json');
            const data = JSON.parse(fs.readFileSync(productsFile, 'utf8'));
            if (Array.isArray(data) && data.length > 0) {
                for (const product of data) {
                    const sql = `INSERT IGNORE INTO products (id, name_fr, name_pt, name_en, category, price, image, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
                    await pool.query(sql, [
                        product.id || product.name,
                        product.name_fr || product.name || '',
                        product.name_pt || product.name || '',
                        product.name_en || product.name || '',
                        product.category || 'General',
                        product.price || 0,
                        product.image || null,
                        product.description || null
                    ]);
                }
                console.log(`✓ Seeded ${data.length} products from public/products.json`);
            }
        }
    } catch (err) {
        console.warn('Could not seed products:', err.message);
    }
}

module.exports = { pool, initDatabase };

