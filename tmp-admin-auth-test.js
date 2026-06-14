require('dotenv').config();
const request = require('supertest');
const app = require('./src/app');
const { initDatabase } = require('./src/config/database');

(async () => {
  try {
    await initDatabase();
    const agent = request.agent(app);
    const loginResp = await agent
      .post('/api/login')
      .send({ username: 'admin', password: 'admin123' })
      .set('Accept', 'application/json');
    console.log('login status', loginResp.status, loginResp.body);
    if (loginResp.status !== 200) {
      return process.exit(1);
    }
    const token = loginResp.body.token;
    const reportResp = await agent
      .get('/api/admin/reports?startDate=2026-04-26&endDate=2026-05-02')
      .set('Authorization', `Bearer ${token}`)
      .set('x-admin-token', token);
    console.log('reports status', reportResp.status, reportResp.body?.error || 'ok');
    process.exit(reportResp.status === 200 ? 0 : 1);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();