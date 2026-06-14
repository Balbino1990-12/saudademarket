const bcrypt = require('bcryptjs');
const { request } = require('../../setup/testApp');
const { createTestUser, createTestAdmin, getCsrfToken } = require('../../setup/testHelpers');
const { clearDatabase } = require('../../setup/database');

describe('Auth Routes', () => {
  beforeEach(async () => {
    await clearDatabase();
  });
  describe('POST /api/login', () => {
    it('should login with valid credentials', async () => {
      await createTestAdmin({ username: 'admin', password: await require('bcryptjs').hash('admin123', 10) });

      const csrfToken = await getCsrfToken(request);

      const response = await request()
        .post('/api/login')
        .set('x-csrf-token', csrfToken)
        .send({ username: 'admin', password: 'admin123' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.accessToken).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      const csrfToken = await getCsrfToken(request);

      const response = await request()
        .post('/api/login')
        .set('x-csrf-token', csrfToken)
        .send({ username: 'admin', password: 'wrongpassword' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/invalid/i);
    });
  });

  describe('POST /api/users/register', () => {
    it('should register a new user', async () => {
      const csrfToken = await getCsrfToken(request);

      const response = await request()
        .post('/api/users/register')
        .set('x-csrf-token', csrfToken)
        .send({
          username: 'newuser',
          email: 'new@example.com',
          password: 'password123',
          country: 'Portugal',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.user.username).toBe('newuser');
    });

    it('should reject duplicate username', async () => {
      await createTestUser({ username: 'existinguser' });

      const csrfToken = await getCsrfToken(request);

      const response = await request()
        .post('/api/users/register')
        .set('x-csrf-token', csrfToken)
        .send({
          username: 'existinguser',
          email: 'different@example.com',
          password: 'password123',
          country: 'Portugal',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});