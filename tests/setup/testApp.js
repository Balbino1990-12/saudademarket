const request = require('supertest');
const express = require('express');

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.SESSION_SECRET = 'test-session-secret';
process.env.DB_NAME = 'portugalstore_test'; // Use test database

// Import app after setting env vars
const app = require('../../src/app');

let server;
let agent;

beforeAll(async () => {
  // The app initialization will handle database setup
  server = app.listen(0); // Random port for testing
});

beforeEach(() => {
  agent = request.agent(app);
});

afterAll(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  // Close database connection only if it is still open
  if (global.db && global.db.pool && typeof global.db.pool.end === 'function') {
    try {
      await global.db.pool.end();
    } catch (err) {
      if (!/closed state|already closed/i.test(err && err.message ? err.message : String(err))) {
        console.warn('[testApp] Database pool shutdown warning:', err && err.message ? err.message : err);
      }
    }
  }
});

module.exports = {
  app,
  request: () => agent || (agent = request.agent(app)),
  server,
};