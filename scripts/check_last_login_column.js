const mysql = require('mysql2/promise');

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'cabo1990',
      database: 'portugalstore_db'
    });

    const [rows] = await conn.query(
      "SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT FROM INFORMATION_SCHEMA.COLUMNS " +
      "WHERE TABLE_SCHEMA = 'portugalstore_db' AND TABLE_NAME = 'users' AND COLUMN_NAME = 'last_login';"
    );

    console.log(JSON.stringify(rows, null, 2));
    await conn.end();
  } catch (err) {
    console.error(err.message || err);
    process.exit(1);
  }
})();
