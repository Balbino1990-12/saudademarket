function errorHandler(err, req, res, next){
  console.error('[ErrorHandler] ', err);
  const message = (err && err.message) ? err.message : 'Server error';
  // Include stack trace in development for diagnostics
  const payload = { error: message };
  if (process.env.NODE_ENV !== 'production') {
    payload.stack = err.stack;
  }
  res.status(500).json(payload);
}

module.exports = errorHandler;
