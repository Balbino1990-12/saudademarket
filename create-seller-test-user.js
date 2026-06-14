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

    console.log('🔧 Creating Seller Test User...\n');

    // Get Seller role ID
    const [roles] = await conn.query('SELECT id FROM roles WHERE name = "Seller" LIMIT 1');
    if (roles.length === 0) {
      console.error('❌ Seller role not found');
      conn.end();
      return;
    }

    const sellerId = roles[0].id;
    console.log(`✓ Found Seller role (ID: ${sellerId})`);

    // Hash password
    const password = 'seller123';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create seller test user
    const userData = {
      username: 'seller_test',
      email: 'seller@test.fr',
      password: hashedPassword,
      first_name: 'Test',
      last_name: 'Seller',
      phone_number: '+351912345678',
      city: 'Porto',
      role_id: sellerId,
      active: true
    };

    const sql = `
      INSERT INTO users (username, email, password, first_name, last_name, phone_number, city, role_id, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await conn.query(sql, [
      userData.username,
      userData.email,
      userData.password,
      userData.first_name,
      userData.last_name,
      userData.phone_number,
      userData.city,
      userData.role_id,
      userData.active
    ]);

    const userId = result[0].insertId;
    console.log(`✓ Created seller user with ID: ${userId}`);

    // Retrieve the created user with role info
    const [userWithRole] = await conn.query(`
      SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.phone_number, u.city,
             u.role_id, r.name as role_name, r.description as role_description,
             u.active, u.created_at
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
    `, [userId]);

    if (userWithRole.length > 0) {
      const user = userWithRole[0];
      console.log('\n📋 Created User Details:');
      console.log('───────────────────────');
      console.log(`ID:          ${user.id}`);
      console.log(`Username:    ${user.username}`);
      console.log(`Email:       ${user.email}`);
      console.log(`Name:        ${user.first_name} ${user.last_name}`);
      console.log(`Phone:       ${user.phone_number}`);
      console.log(`City:        ${user.city}`);
      console.log(`Role:        ${user.role_name} (ID: ${user.role_id})`);
      console.log(`Active:      ${user.active ? 'Yes' : 'No'}`);
      console.log(`Created:     ${user.created_at}`);
      console.log('───────────────────────');
      console.log(`\n🔑 Test Login Credentials:`);
      console.log('───────────────────────');
      console.log(`Username: ${userData.username}`);
      console.log(`Password: ${password}`);
      console.log('───────────────────────');
    }

    conn.end();
    console.log('\n✅ Seller test user successfully created!\n');
  } catch(e) {
    console.error('❌ Error:', e.message);
  }
})();

