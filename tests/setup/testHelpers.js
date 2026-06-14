const bcrypt = require('bcryptjs');
const User = require('../../src/models/User');

async function createTestUser(overrides = {}) {
  const defaultUser = {
    username: 'testuser',
    email: 'test@example.com',
    password: await bcrypt.hash('password123', 10),
    role: 'buyer',
    ...overrides,
  };

  return await User.create(defaultUser);
}

async function createTestAdmin(overrides = {}) {
  return await createTestUser({
    username: 'admin',
    email: 'admin@example.com',
    role: 'admin',
    ...overrides,
  });
}

/**
 * Get CSRF token for testing
 * @param {Object} request - Supertest request instance
 * @returns {string} CSRF token
 */
async function getCsrfToken(requestOrFn) {
  const request = typeof requestOrFn === 'function' ? requestOrFn() : requestOrFn;
  const response = await request
    .get('/csrf-token')
    .expect(200);

  return response.body.csrfToken;
}

module.exports = {
  createTestUser,
  createTestAdmin,
  getCsrfToken,
};