export function notFound(req, res, next) {
  res.status(404).json({ error: 'Not Found' });
}

export function errorHandler(err, req, res, next) {
  // Normalize common Mongoose casting errors so they don't appear as opaque 500s
  if (err?.name === 'CastError') {
    err.status = 400;
    err.message = 'Invalid identifier';
  }
  
  // SECURITY: Log full error server-side but sanitize for client
  console.error('[ERROR]', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    user: req.user?._id
  });
  
  const status = err.status || 500;
  
  // SECURITY: In production, hide internal error details
  // Development: show full error for debugging
  if (process.env.NODE_ENV === 'production' && status === 500) {
    // Generic message for 500 errors in production
    res.status(500).json({ error: 'Internal server error' });
  } else {
    // Show actual error message for client errors (4xx) or in development
    res.status(status).json({ error: err.message || 'Server Error' });
  }
}

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
