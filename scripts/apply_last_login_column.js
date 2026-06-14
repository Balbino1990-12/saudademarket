const mysql = require('mysql2/promise');

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'cabo1990',
      database: 'portugalstore_db'
    });

    await conn.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login DATETIME NULL DEFAULT NULL;");
    console.log('✅ last_login column added or already exists');
    await conn.end();
  } catch (err) {
    console.error('❌', err.message || err);
    process.exit(1);
  }
})();
