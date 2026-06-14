require('dotenv').config();
const http = require('http');

async function makeRequest(method, path) {
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
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function testAPIResponse() {
  try {
    console.log('📡 Testing API Role Responses\n');

    // Get all roles
    console.log('Fetching /api/roles (list)...\n');
    const listRes = await makeRequest('GET', '/api/roles');
    
    if (listRes.status !== 200) {
      console.error('❌ Failed to get roles list:', listRes);
      return;
    }

    if (Array.isArray(listRes.data)) {
      listRes.data.forEach((role, idx) => {
        console.log(`Role ${idx}: ${role.name} (ID: ${role.id})`);
        console.log(`  permissions type: ${typeof role.permissions}`);
        console.log(`  permissions value:`, role.permissions);
        console.log('');
      });
    }

    // Get single role
    console.log('\nFetching /api/roles/3 (single Seller role)...\n');
    const singleRes = await makeRequest('GET', '/api/roles/3');
    if (singleRes.status === 200) {
      const role = singleRes.data;
      console.log(`Role: ${role.name} (ID: ${role.id})`);
      console.log(`permissions type: ${typeof role.permissions}`);
      console.log(`permissions value:`, role.permissions);
      console.log(`\nCan check with: role.permissions && typeof role.permissions === 'object' ? ${role.permissions && typeof role.permissions === 'object'}`);
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

testAPIResponse();

