const app = require('./app');
const SessionManager = require('./services/SessionManager');
const PORT = process.env.PORT || 3000;

console.log(`Starting server on port ${PORT}...`);

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`[SessionManager] Ready to manage admin sessions`);
});

// Periodic session cleanup (every 60 minutes)
const cleanupInterval = setInterval(() => {
  const cleaned = SessionManager.cleanup();
  const activeCount = SessionManager.getActiveCount();
  console.log(`[SessionManager] Active sessions: ${activeCount}`);
}, 60 * 60 * 1000);

// Handle server errors
server.on('error', (err) => {
  console.error('Server error:', err.message);
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
  }
  process.exit(1);
});

server.on('listening', () => {
  console.log(`✓ Server successfully listening on port ${PORT}`);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  clearInterval(cleanupInterval);
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('exit', (code) => {
  console.log(`Process exiting with code: ${code}`);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
