/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} →`, err.message);

  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ message: 'Validation failed', errors });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(409).json({ message: `${field} already in use.` });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid ID format.' });
  }

  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    message: err.message || 'Internal server error.',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
