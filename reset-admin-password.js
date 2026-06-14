const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'portugalstore_db'
    });

    console.log('\n🔧 Resetting Admin Password...\n');
    
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log('✓ Generated bcrypt hash for password');
    
    // Update admin password
    await conn.query('UPDATE users SET password = ? WHERE username = "admin"', [hashedPassword]);
    console.log('✓ Updated admin password in database');

    // Verify the update
    const [user] = await conn.query('SELECT username, password FROM users WHERE username = "admin"');
    if (user.length > 0) {
      const isValid = await bcrypt.compare(password, user[0].password);
      console.log(`\n✓ Password verification: ${isValid ? 'Valid ✓' : 'Invalid ✗'}`);
    }

    console.log('\n📋 Admin Credentials:');
    console.log('───────────────────────');
    console.log('Username: admin');
    console.log('Password: admin123');
    console.log('───────────────────────');

    conn.end();
    console.log('\n✅ Admin password reset successfully!\n');
  } catch(e) {
    console.error('❌ Error:', e.message);
  }
})();

