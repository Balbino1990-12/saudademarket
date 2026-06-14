const bcrypt = require('bcryptjs');
const { createTestUser, createTestAdmin } = require('../../setup/testHelpers');
const User = require('../../../src/models/User');
const { clearDatabase } = require('../../setup/database');

describe('User Model', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  describe('User creation', () => {
    it('should create a user with valid data', async () => {
      const user = await createTestUser();
      expect(user.username).toBe('testuser');
      expect(user.email).toBe('test@example.com');
      expect(user.role).toBe('buyer');
      expect(user.password).toBeDefined();
    });

    it('should hash password on creation', async () => {
      const user = await createTestUser({ password: 'plainpassword' });
      expect(user.password).not.toBe('plainpassword');
      expect(await bcrypt.compare('plainpassword', user.password)).toBe(true);
    });
  });

  describe('User validation', () => {
    it('should require username', async () => {
      await expect(User.create({
        email: 'test@example.com',
        password: 'password123',
      })).rejects.toThrow();
    });

    it('should require email', async () => {
      await expect(User.create({
        username: 'testuser',
        password: 'password123',
      })).rejects.toThrow();
    });

    it('should require password', async () => {
      await expect(User.create({
        username: 'testuser',
        email: 'test@example.com',
      })).rejects.toThrow();
    });
  });
});