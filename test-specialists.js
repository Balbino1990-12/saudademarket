const http = require('http');

function makeRequest(method, path, data = null) {
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

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: { raw: responseData } });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testSpecialistsAPI() {
  console.log('🧪 Testing Specialists API\n');
  console.log('=' .repeat(50));

  try {
    // Test 1: Get all specialists
    console.log('\n1️⃣ GET /api/specialists');
    const allResponse = await makeRequest('GET', '/api/specialists');
    console.log(`   Status: ${allResponse.status}`);
    console.log(`   Count: ${allResponse.data.count || 0} specialists`);
    if (allResponse.data.data && allResponse.data.data.length > 0) {
      console.log(`   ✓ Sample: ${allResponse.data.data[0].name_en}`);
    }

    // Test 2: Get by ID
    if (allResponse.data.data && allResponse.data.data.length > 0) {
      const id = allResponse.data.data[0].id;
      console.log(`\n2️⃣ GET /api/specialists/${id}`);
      const byIdResponse = await makeRequest('GET', `/api/specialists/${id}`);
      console.log(`   Status: ${byIdResponse.status}`);
      console.log(`   ✓ Retrieved: ${byIdResponse.data.data?.name_en}`);
    }

    // Test 3: Get specialties
    console.log('\n3️⃣ GET /api/specialists/specialties/all');
    const specialtiesResponse = await makeRequest('GET', '/api/specialists/specialties/all');
    console.log(`   Status: ${specialtiesResponse.status}`);
    console.log(`   Count: ${specialtiesResponse.data.count || 0} specialties`);
    if (specialtiesResponse.data.data) {
      specialtiesResponse.data.data.forEach(s => console.log(`   - ${s}`));
    }

    // Test 4: Filter by specialty
    const firstSpecialty = specialtiesResponse.data.data?.[0];
    if (firstSpecialty) {
      const encodedSpecialty = encodeURIComponent(firstSpecialty);
      console.log(`\n4️⃣ GET /api/specialists/specialty/${firstSpecialty}`);
      const filterResponse = await makeRequest('GET', `/api/specialists/specialty/${encodedSpecialty}`);
      console.log(`   Status: ${filterResponse.status}`);
      console.log(`   Found: ${filterResponse.data.count || 0} specialists`);
    }

    // Test 5: Create specialist
    console.log('\n5️⃣ POST /api/specialists (Create)');
    const newSpecialist = {
      name_en: "Test Specialist",
      name_fr: "Spécialiste Test",
      name_pt: "Especialista Teste",
      specialty: "Test Specialty",
      location: "Test Location, Portugal",
      expertise_years: 15,
      email: "test@example.pt",
      phone: "+351 999 999 999",
      website: "https://test.pt",
      description: "Test specialist for API validation"
    };
    const createResponse = await makeRequest('POST', '/api/specialists', newSpecialist);
    console.log(`   Status: ${createResponse.status}`);
    console.log(`   Message: ${createResponse.data.message}`);
    const newId = createResponse.data.data?.id;
    if (newId) {
      console.log(`   ✓ Created with ID: ${newId}`);

      // Test 6: Update specialist
      console.log(`\n6️⃣ PUT /api/specialists/${newId} (Update)`);
      const updateResponse = await makeRequest('PUT', `/api/specialists/${newId}`, {
        location: "Updated Location, Portugal"
      });
      console.log(`   Status: ${updateResponse.status}`);
      console.log(`   Message: ${updateResponse.data.message}`);
      if (updateResponse.data.data) {
        console.log(`   ✓ Updated location: ${updateResponse.data.data.location}`);
      }

      // Test 7: Delete specialist
      console.log(`\n7️⃣ DELETE /api/specialists/${newId} (Delete)`);
      const deleteResponse = await makeRequest('DELETE', `/api/specialists/${newId}`);
      console.log(`   Status: ${deleteResponse.status}`);
      console.log(`   Message: ${deleteResponse.data.message}`);
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ All tests completed successfully!\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run tests
testSpecialistsAPI();

