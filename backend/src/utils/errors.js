export function notFound(req, res, next) {
  res.status(404).json({ error: 'Not Found' });
}

export function errorHandler(err, req, res, next) {
  // SECURITY: Normalize common Mongoose errors
  if (err?.name === 'CastError') {
    err.status = 400;
    err.message = 'Invalid identifier';
  }
  
  // SECURITY: Handle validation errors
  if (err?.name === 'ValidationError') {
    err.status = 400;
    // Don't expose detailed validation messages in production
    err.message = process.env.NODE_ENV === 'production' 
      ? 'Validation failed' 
      : err.message;
  }
  
  // SECURITY: Handle duplicate key errors
  if (err?.code === 11000) {
    err.status = 409;
    err.message = 'Duplicate entry';
  }
  
  // SECURITY: Log full error server-side for debugging
  // NEVER expose stack traces or internal details to client
  console.error('[ERROR]', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    user: req.user?._id,
    timestamp: new Date().toISOString()
  });
  
  const status = err.status || 500;
  
  // SECURITY: In production, hide ALL internal error details
  if (process.env.NODE_ENV === 'production') {
    if (status >= 500) {
      // Never expose internal server errors
      return res.status(500).json({ error: 'Internal server error' });
    }
    // For client errors, use sanitized message
    return res.status(status).json({ error: err.message || 'Request failed' });
  }
  
  // Development: show detailed error for debugging (but still no stack traces to client)
  res.status(status).json({ 
    error: err.message || 'Server Error',
    // Only include debug info in development
    ...(process.env.NODE_ENV === 'development' && { 
      debug: { path: req.path, method: req.method } 
    })
  });
}

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
