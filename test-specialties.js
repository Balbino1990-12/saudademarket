/**
 * Test Specialties API Endpoints
 * Usage: node test-specialties.js
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';

/**
 * Make HTTP request
 */
function makeRequest(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(BASE_URL + path);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve({ status: res.statusCode, data: json });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

/**
 * Test GET /api/specialties
 */
async function testGetAllSpecialties() {
    console.log('\n📝 TEST 1: GET /api/specialties (Get All)');
    try {
        const result = await makeRequest('GET', '/api/specialties');
        console.log(`Status: ${result.status}`);
        console.log(`Data:`, JSON.stringify(result.data, null, 2));
        return result.data.data || [];
    } catch (error) {
        console.error('Error:', error.message);
        return [];
    }
}

/**
 * Test GET /api/specialties/categories/all
 */
async function testGetCategories() {
    console.log('\n📝 TEST 2: GET /api/specialties/categories/all (Get Categories)');
    try {
        const result = await makeRequest('GET', '/api/specialties/categories/all');
        console.log(`Status: ${result.status}`);
        console.log(`Data:`, JSON.stringify(result.data, null, 2));
        return result.data.data || [];
    } catch (error) {
        console.error('Error:', error.message);
        return [];
    }
}

/**
 * Test GET /api/specialties/:id
 */
async function testGetById(id) {
    console.log('\n📝 TEST 3: GET /api/specialties/:id (Get One)');
    try {
        const result = await makeRequest('GET', `/api/specialties/${id}`);
        console.log(`Status: ${result.status}`);
        console.log(`Data:`, JSON.stringify(result.data, null, 2));
    } catch (error) {
        console.error('Error:', error.message);
    }
}

/**
 * Test GET /api/specialties/category/:category
 */
async function testGetByCategory(category) {
    console.log('\n📝 TEST 4: GET /api/specialties/category/:category (Filter by Category)');
    try {
        const result = await makeRequest('GET', `/api/specialties/category/${encodeURIComponent(category)}`);
        console.log(`Status: ${result.status}`);
        console.log(`Data:`, JSON.stringify(result.data, null, 2));
    } catch (error) {
        console.error('Error:', error.message);
    }
}

/**
 * Test POST /api/specialties (Create)
 */
async function testCreateSpecialty() {
    console.log('\n📝 TEST 5: POST /api/specialties (Create New)');
    const newSpecialty = {
        name_en: 'Test Specialty',
        name_fr: 'Test Specialité',
        name_pt: 'Teste Especialidade',
        category: 'Test Category',
        description: 'This is a test specialty',
        image: 'https://example.com/image.jpg',
        icon: '🧪',
        color: '#FF5733',
        active: 1
    };
    
    try {
        const result = await makeRequest('POST', '/api/specialties', newSpecialty);
        console.log(`Status: ${result.status}`);
        console.log(`Data:`, JSON.stringify(result.data, null, 2));
        return result.data.data ? result.data.data.id : null;
    } catch (error) {
        console.error('Error:', error.message);
        return null;
    }
}

/**
 * Test PUT /api/specialties/:id (Update)
 */
async function testUpdateSpecialty(id) {
    console.log('\n📝 TEST 6: PUT /api/specialties/:id (Update)');
    const updateData = {
        name_en: 'Updated Specialty',
        description: 'This specialty has been updated',
        color: '#33FF57'
    };
    
    try {
        const result = await makeRequest('PUT', `/api/specialties/${id}`, updateData);
        console.log(`Status: ${result.status}`);
        console.log(`Data:`, JSON.stringify(result.data, null, 2));
    } catch (error) {
        console.error('Error:', error.message);
    }
}

/**
 * Test DELETE /api/specialties/:id
 */
async function testDeleteSpecialty(id) {
    console.log('\n📝 TEST 7: DELETE /api/specialties/:id (Delete)');
    try {
        const result = await makeRequest('DELETE', `/api/specialties/${id}`);
        console.log(`Status: ${result.status}`);
        console.log(`Data:`, JSON.stringify(result.data, null, 2));
    } catch (error) {
        console.error('Error:', error.message);
    }
}

/**
 * Run all tests
 */
async function runTests() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('     SPECIALTIES API TEST SUITE');
    console.log('═══════════════════════════════════════════════════════');
    
    // Get all specialties
    const specialties = await testGetAllSpecialties();
    
    // Get categories
    const categories = await testGetCategories();
    
    if (specialties.length > 0) {
        // Get one specialty
        const firstId = specialties[0].id;
        await testGetById(firstId);
        
        // Get by category
        if (specialties[0].category) {
            await testGetByCategory(specialties[0].category);
        }
        
        // Create new
        const newId = await testCreateSpecialty();
        
        // Update
        if (newId) {
            await testUpdateSpecialty(newId);
            
            // Delete
            await testDeleteSpecialty(newId);
        }
    } else {
        console.log('\n⚠️  No specialties found. Add specialties first: node add-specialties.js');
    }
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('     TEST SUITE COMPLETE');
    console.log('═══════════════════════════════════════════════════════\n');
}

// Run
runTests().catch(console.error);
