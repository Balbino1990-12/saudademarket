/**
 * Main server entry point for the PortugalStore backend.
 * Initializes Express app, Redis client, Socket.IO, and handles process events.
 * @module server
 */
const app = require('./app');

/**
 * Get a Redis client instance (may be a no-op if Redis is not configured).
 * @function
 */
const { getRedisClient } = require('./config/redis');

/**
 * Socket.IO server class for real-time communication.
 */
const { Server } = require('socket.io');

/**
 * The port on which the server will listen.
 * @type {number}
 */
const PORT = process.env.PORT || 3000;

console.log(`Starting server on port ${PORT}...`);


/**
 * Initialize Redis connection (may be a no-op if Redis integration rolled back).
 * @type {import('redis').RedisClientType | null}
 */
const redisClient = getRedisClient();


/**
 * Start the HTTP server and log status.
 * @type {import('http').Server}
 */
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  if (redisClient && redisClient.isOpen) {
    console.log('✓ Redis connection initialized');
  } else {
    console.log('⚠️ Redis connection not established, falling back to memory cache/session');
  }
});


/**
 * Initialize Socket.IO for real-time features (e.g., cart updates).
 * @type {Server}
 */
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.set('io', io);


/**
 * Handle Socket.IO connections and events.
 * @event connection
 * @param {import('socket.io').Socket} socket
 */
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  /**
   * Join a user to their cart room for real-time cart updates.
   * @event joinCart
   * @param {string} userId
   */
  socket.on('joinCart', (userId) => {
    if (userId) {
      socket.join(`cart_${userId}`);
      console.log(`Socket ${socket.id} joined cart_${userId}`);
    }
  });

  /**
   * Handle socket disconnection.
   * @event disconnect
   */
  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});


/**
 * Handle server errors (e.g., port in use).
 * @event error
 * @param {Error & { code?: string }} err
 */
server.on('error', (err) => {
  console.error('Server error:', err.message);
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
  }
  process.exit(1);
});


/**
 * Log when the server is successfully listening.
 * @event listening
 */
server.on('listening', () => {
  console.log(`✓ Server successfully listening on port ${PORT}`);
});


/**
 * Handle graceful shutdown on SIGINT (Ctrl+C).
 * @event SIGINT
 */
process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    if (redisClient && typeof redisClient.quit === 'function') {
      Promise.resolve(redisClient.quit()).then(() => {
        console.log('Redis connection closed');
        process.exit(0);
      }).catch(() => process.exit(0));
    } else {
      process.exit(0);
    }
  });
});


/**
 * Handle graceful shutdown on SIGTERM (e.g., from process manager).
 * @event SIGTERM
 */
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    if (redisClient && typeof redisClient.quit === 'function') {
      Promise.resolve(redisClient.quit()).then(() => {
        console.log('Redis connection closed');
        process.exit(0);
      }).catch(() => process.exit(0));
    } else {
      process.exit(0);
    }
  });
});


/**
 * Log process exit code.
 * @event exit
 * @param {number} code
 */
process.on('exit', (code) => {
  console.log(`Process exiting with code: ${code}`);
});


/**
 * Handle uncaught exceptions to prevent silent crashes.
 * @event uncaughtException
 * @param {Error} err
 */
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  process.exit(1);
});


/**
 * Handle unhandled promise rejections.
 * @event unhandledRejection
 * @param {*} reason
 * @param {Promise} promise
 */
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

