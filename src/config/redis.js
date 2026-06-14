// Redis integration was added previously but is now rolled back.
// This module provides no-op stubs so the rest of the codebase
// can continue to require it without attempting to connect to Redis.

function getRedisClient() {
  return null;
}

function createRedisClient() {
  return null;
}

function closeRedisConnection() {
  return Promise.resolve();
}

function isRedisConnected() {
  return false;
}

module.exports = {
  createRedisClient,
  getRedisClient,
  closeRedisConnection,
  isRedisConnected
};