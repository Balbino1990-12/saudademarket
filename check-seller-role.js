const { pool, initDatabase } = require('./src/config/database');

const checkSeller = async () => {
  try {
    await initDatabase();
    
    const [users] = await pool.query(`
      SELECT u.id, u.username, u.role_id, r.name as role_name, r.permissions
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.username = 'seller_test'
    `);
    
    const [roles] = await pool.query('SELECT id, name, permissions FROM roles');
    
    console.log('\n📊 Seller Test User:');
    console.log(JSON.stringify(users, null, 2));
    
    console.log('\n📋 Available Roles:');
    console.log(JSON.stringify(roles, null, 2));
    
    if (users.length > 0 && !users[0].role_id) {
      console.log('\n⚠️ Seller has no role assigned!');
      
      // Find seller role
      const sellerRole = roles.find(r => r.name.toLowerCase() === 'seller');
      if (sellerRole) {
        console.log(`✅ Found 'seller' role with ID: ${sellerRole.id}`);
        console.log('🔧 Assigning seller role to seller_test user...');
        
        const [result] = await pool.query(
          'UPDATE users SET role_id = ? WHERE username = ?',
          [sellerRole.id, 'seller_test']
        );
        console.log('✅ Successfully assigned seller role!');
      }
    } else {
      console.log('\n✅ Seller already has a role assigned!');
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
};

checkSeller();

