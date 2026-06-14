const { connect, closeDatabase, clearDatabase } = require('./database');

// Setup before all tests
beforeAll(async () => {
  await connect();
});

// Clear database before each test
beforeEach(async () => {
  await clearDatabase();
});

// Close database after all tests
afterAll(async () => {
  await closeDatabase();
});