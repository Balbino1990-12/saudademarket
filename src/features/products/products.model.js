// simple data mapper for products
const { pool } = require('../../config/database');

async function getAll(){
  const [rows] = await pool.query('SELECT * FROM products');
  return rows;
}

module.exports = { getAll };