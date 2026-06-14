const http = require('http');

function testLogin() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      username: 'admin',
      password: 'admin123'
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = http.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        console.log('\n🔐 Login Test Result:');
        console.log('───────────────────────');
        console.log(`Status Code: ${res.statusCode}`);
        console.log(`Response: ${body}`);
        console.log('───────────────────────\n');
        
        try {
          const response = JSON.parse(body);
          if (res.statusCode === 200 && response.success) {
            console.log('✅ LOGIN SUCCESSFUL! 🎉');
            console.log(`Token: ${response.token.substring(0, 20)}...`);
          } else {
            console.log(`❌ Login failed: ${response.error || 'Unknown error'}`);
          }
        } catch (e) {
          console.log(`Response body: ${body}`);
        }
        resolve();
      });
    });

    req.on('error', (error) => {
      console.error('❌ Error:', error.message);
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

(async () => {
  console.log('🧪 Testing Admin Login...\n');
  console.log('Sending login request to: http://localhost:3000/api/login');
  console.log('Credentials: admin / admin123');
  
  try {
    await testLogin();
  } catch (e) {
    console.error('Test failed:', e.message);
  }
})();

