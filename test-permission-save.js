require('dotenv').config();
const http = require('http');

// Admin login credentials
const adminUser = 'admin';
const adminPass = 'admin123';

async function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function testPermissionSave() {
  try {
    console.log('🧪 Testing Permission Save Flow\n');

    // Step 1: Login
    console.log('Step 1: Logging in...');
    const loginRes = await makeRequest('POST', '/api/login', {
      username: adminUser,
      password: adminPass
    });
    
    if (loginRes.status !== 200) {
      console.error('❌ Login failed:', loginRes);
      return;
    }

    const token = loginRes.data.token;
    console.log('✅ Login successful, token:', token.substring(0, 20) + '...\n');

    // Step 2: Get the first role (Buyer - ID 2)
    console.log('Step 2: Fetching role (ID 2)...');
    const getRoleRes = await makeRequest('GET', '/api/roles/2');
    if (getRoleRes.status !== 200) {
      console.error('❌ Failed to get role:', getRoleRes);
      return;
    }
    const role = getRoleRes.data;
    console.log('✅ Current role:', role.name);
    console.log('   Permissions:', JSON.stringify(role.permissions, null, 2) + '\n');

    // Step 3: Update role with new permissions
    console.log('Step 3: Updating role with new permissions...');
    const newPermissions = {
      view_products: true,
      manage_products: true,
      view_categories: true,
      manage_categories: true,
      view_users: false,
      manage_users: false,
      manage_roles: false,
      view_activities: true,
      delete_activities: false,
      system_settings: false
    };

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/roles/2',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };

    const updateRes = await new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode, data: data });
          }
        });
      });
      req.on('error', reject);
      req.write(JSON.stringify({
        name: role.name,
        description: role.description,
        permissions: newPermissions,
        active: role.active
      }));
      req.end();
    });

    if (updateRes.status !== 200) {
      console.error('❌ Update failed:', updateRes);
      return;
    }
    console.log('✅ Role updated successfully\n');

    // Step 4: Verify update
    console.log('Step 4: Verifying update (fetching role again)...');
    const verifyRes = await makeRequest('GET', '/api/roles/2');
    if (verifyRes.status === 200) {
      console.log('✅ Verification successful');
      console.log('   Updated permissions:', JSON.stringify(verifyRes.data.permissions, null, 2));
    } else {
      console.error('❌ Verification failed:', verifyRes);
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

testPermissionSave();

