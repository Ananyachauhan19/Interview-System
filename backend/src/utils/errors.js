export function notFound(req, res, next) {
  res.status(404).json({ error: 'Not Found' });
}

export function errorHandler(err, req, res, next) {
  // Normalize common Mongoose casting errors so they don't appear as opaque 500s
  if (err?.name === 'CastError') {
    err.status = 400;
    err.message = 'Invalid identifier';
  }
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Server Error' });
}

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
