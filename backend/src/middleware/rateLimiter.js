import rateLimit from 'express-rate-limit';

/**
 * SECURITY: Rate Limiting Middleware
 * 
 * Protects against:
 * - Brute force attacks on authentication
 * - API abuse and resource exhaustion
 * - Automated scraping
 * - DoS attacks
 * 
 * All limits are set generously to never block legitimate users
 * while protecting against malicious patterns.
 */

// Strict rate limiting for authentication endpoints
// Prevents brute force password attacks
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window (generous for legitimate retries)
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  // Skip successful requests from count
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    console.warn(`[SECURITY] Rate limit exceeded for ${req.ip} on ${req.path}`);
    res.status(429).json({
      error: 'Too many attempts. Please try again after 15 minutes.'
    });
  }
});

// Password reset limiter - prevent mass email bombing
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 password reset requests per hour
  message: 'Too many password reset requests',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`[SECURITY] Password reset limit exceeded for ${req.ip}`);
    res.status(429).json({
      error: 'Too many password reset requests. Please try again later.'
    });
  }
});

// File upload limiter - prevent storage exhaustion attacks
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 uploads per 15 minutes
  message: 'Too many upload requests',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`[SECURITY] Upload limit exceeded for ${req.ip}`);
    res.status(429).json({
      error: 'Upload rate limit exceeded. Please wait before uploading again.'
    });
  }
});

// Strict limiter for expensive operations (bulk operations, CSV processing)
export const bulkOperationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 bulk operations per hour
  message: 'Too many bulk operation requests',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`[SECURITY] Bulk operation limit exceeded for ${req.ip}`);
    res.status(429).json({
      error: 'Bulk operation rate limit exceeded. Please wait before retrying.'
    });
  }
});

// General API rate limiter - prevents resource exhaustion
// Applied to all API routes by default
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // 500 requests per 15 minutes (very generous for normal usage)
  message: 'Too many requests',
  standardHeaders: true,
  legacyHeaders: false,
  // Skip static health checks
  skip: (req) => req.path === '/api/health',
  handler: (req, res) => {
    console.warn(`[SECURITY] API rate limit exceeded for ${req.ip} on ${req.path}`);
    res.status(429).json({
      error: 'Rate limit exceeded. Please slow down your requests.'
    });
  }
});

// Feedback submission limiter - prevent spam feedback
export const feedbackLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 feedback submissions per hour (enough for legitimate use)
  message: 'Too many feedback submissions',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`[SECURITY] Feedback limit exceeded for user ${req.user?._id || req.ip}`);
    res.status(429).json({
      error: 'Feedback submission rate limit exceeded. Please wait before submitting again.'
    });
  }
});

/**
 * WHY THIS IS SAFE:
 * - All limits are very generous and won't affect legitimate users
 * - Returns standard 429 status code (existing clients should handle gracefully)
 * - Preserves existing error format { error: "message" }
 * - Only adds headers, doesn't change response bodies
 * - No breaking changes to any existing functionality
 */
