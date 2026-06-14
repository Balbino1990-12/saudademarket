process.env.NODE_ENV='test';
process.env.JWT_SECRET='test-jwt-secret';
process.env.SESSION_SECRET='test-session-secret';
process.env.DB_NAME='portugalstore_test';
const request = require('supertest');
const app = require('./src/app');
(async () => {
  const agent = request.agent(app);
  const csrf = (await agent.get('/csrf-token')).body.csrfToken;
  const res = await agent.post('/api/users/register')
    .set('x-csrf-token', csrf)
    .send({ username: 'newuser', email: 'new@example.com', password: 'password123', country: 'Portugal' })
    .then(r => ({ status: r.status, body: r.body }))
    .catch(err => ({ status: err.status, body: err.response && err.response.body, message: err.message }));
  console.log('STATUS', res.status);
  console.log('BODY', JSON.stringify(res.body, null, 2));
  process.exit(0);
})();
