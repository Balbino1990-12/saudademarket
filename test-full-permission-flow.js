require('dotenv').config();
const http = require('http');

const adminUser = 'admin';
const adminPass = 'admin123';

async function makeRequest(method, path, data = null, token = null) {
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

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

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

async function fullPermissionTest() {
  try {
    console.log('🧪 FULL PERMISSION SAVE TEST\n');
    console.log('This test simulates the complete workflow:\n');
    console.log('1. User logs in');
    console.log('2. User clicks "Edit" on a role');
    console.log('3. User checks/unchecks permissions');
    console.log('4. User clicks "Save"');
    console.log('5. User clicks "Edit" again to verify permissions were saved\n');
    console.log('='.repeat(60) + '\n');

    // ===== STEP 1: Login =====
    console.log('STEP 1️⃣  Admin Login');
    console.log('-'.repeat(40));
    const loginRes = await makeRequest('POST', '/api/login', {
      username: adminUser,
      password: adminPass
    });
    
    if (loginRes.status !== 200) {
      console.error('❌ Login failed');
      return;
    }

    const token = loginRes.data.token;
    console.log('✅ Logged in successfully');
    console.log(`📝 Token: ${token.substring(0, 30)}...\n`);

    // ===== STEP 2: Fetch roles (simulate page load) =====
    console.log('STEP 2️⃣  Load Roles List (simulating page load)');
    console.log('-'.repeat(40));
    const listRes = await makeRequest('GET', '/api/roles', null, token);
    if (listRes.status !== 200) {
      console.error('❌ Failed to load roles');
      return;
    }
    const roles = listRes.data;
    console.log(`✅ Loaded ${roles.length} roles`);
    
    // Find the "seller" role
    const sellerRole = roles.find(r => r.name === 'seller');
    if (!sellerRole) {
      console.error('❌ Seller role not found');
      return;
    }
    console.log(`📋 Selected role: "${sellerRole.name}" (ID: ${sellerRole.id})\n`);

    // ===== STEP 3: Get single role (click Edit) =====
    console.log('STEP 3️⃣  Get Role Details (user clicks Edit)');
    console.log('-'.repeat(40));
    const getRoleRes = await makeRequest('GET', `/api/roles/${sellerRole.id}`, null, token);
    if (getRoleRes.status !== 200) {
      console.error('❌ Failed to get role details');
      return;
    }
    const role = getRoleRes.data;
    console.log(`✅ Fetched role details: "${role.name}"`);
    console.log('Current permissions:');
    Object.entries(role.permissions || {}).forEach(([perm, val]) => {
      console.log(`  ${val ? '✓' : '✗'} ${perm}`);
    });
    console.log('');

    // ===== STEP 4: Simulate permission changes =====
    console.log('STEP 4️⃣  User Modifies Permissions');
    console.log('-'.repeat(40));
    console.log('Simulating user changes:');
    console.log('  ✓ Setting manage_categories to TRUE');
    console.log('  ✓ Setting view_activities to FALSE\n');

    const newPermissions = { ...role.permissions };
    newPermissions.manage_categories = true;
    newPermissions.view_activities = false;

    // ===== STEP 5: Save changes =====
    console.log('STEP 5️⃣  Save Changes (user clicks Save)');
    console.log('-'.repeat(40));
    
    const updateRes = await makeRequest('PUT', `/api/roles/${sellerRole.id}`, {
      name: role.name,
      description: role.description,
      permissions: newPermissions,
      active: role.active
    }, token);

    if (updateRes.status !== 200) {
      console.error('❌ Failed to save role');
      console.error('Response:', updateRes);
      return;
    }

    console.log('✅ Role saved successfully');
    console.log('Server response:', updateRes.data.name, '- permissions count:', Object.keys(updateRes.data.permissions || {}).length);
    console.log('');

    // ===== STEP 6: Verify changes =====
    console.log('STEP 6️⃣  Verify Changes (user clicks Edit again)');
    console.log('-'.repeat(40));
    
    const verifyRes = await makeRequest('GET', `/api/roles/${sellerRole.id}`, null, token);
    if (verifyRes.status !== 200) {
      console.error('❌ Failed to verify role');
      return;
    }

    const updatedRole = verifyRes.data;
    console.log(`✅ Verification successful`);
    console.log('Updated permissions:');
    
    let changesCorrect = true;
    Object.entries(updatedRole.permissions || {}).forEach(([perm, val]) => {
      const statusIcon = val ? '✓' : '✗';
      console.log(`  ${statusIcon} ${perm}`);
      if (perm === 'manage_categories' && val !== true) changesCorrect = false;
      if (perm === 'view_activities' && val !== false) changesCorrect = false;
    });

    console.log('');
    console.log('='.repeat(60));
    if (changesCorrect) {
      console.log('✅ SUCCESS! Permissions were saved correctly!');
      console.log('');
      console.log('Summary:');
      console.log(`✓ manage_categories changed to: ${updatedRole.permissions.manage_categories}`);
      console.log(`✓ view_activities changed to: ${updatedRole.permissions.view_activities}`);
    } else {
      console.log('❌ FAILED! Changes were not persisted correctly');
    }
    console.log('='.repeat(60) + '\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

fullPermissionTest();
