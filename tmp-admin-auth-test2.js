require('dotenv').config();
const request = require('supertest');
const app = require('./src/app');
const { initDatabase } = require('./src/config/database');

(async () => {
  try {
    await initDatabase();
    const agent = request.agent(app);
    const csrfResp = await agent.get('/csrf-token');
    console.log('csrf status', csrfResp.status, csrfResp.body);
    const csrfToken = csrfResp.body.csrfToken;
    const loginResp = await agent
      .post('/api/login')
      .set('Accept', 'application/json')
      .set('X-CSRF-Token', csrfToken)
      .send({ username: 'admin', password: 'admin123' });
    console.log('login status', loginResp.status, loginResp.body);
    const token = loginResp.body.token;
    const reportResp = await agent
      .get('/api/admin/reports?startDate=2026-04-26&endDate=2026-05-02')
      .set('Authorization', `Bearer ${token}`)
      .set('x-admin-token', token);
    console.log('reports status', reportResp.status, reportResp.body);
    process.exit(reportResp.status === 200 ? 0 : 1);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();