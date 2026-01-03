import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import routes from './routes/index.js';
import { notFound, errorHandler } from './utils/errors.js';
import { mongoSanitizeMiddleware, xssProtectionMiddleware, validateContentType } from './middleware/sanitization.js';
import { apiLimiter } from './middleware/rateLimiter.js';

const app = express();

// SECURITY: Enhanced security headers with helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Required for some frontend frameworks
      styleSrc: ["'self'", "'unsafe-inline'"], // Required for Tailwind CSS
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", process.env.FRONTEND_ORIGIN || 'http://localhost:5173'].filter(Boolean),
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    }
  },
  crossOriginEmbedderPolicy: false, // Don't break existing functionality
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// SECURITY: Additional security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});

// CORS - lock down to specific origins in production
const allowedOrigins = process.env.FRONTEND_ORIGIN?.split(',').map(o => o.trim()).filter(Boolean) || [];
app.use(cors({ 
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, same-origin)
    if (!origin) return callback(null, true);
    // In development, allow all origins
    if (process.env.NODE_ENV !== 'production') return callback(null, true);
    // In production, only allow configured origins
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`[SECURITY] Blocked CORS request from: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  maxAge: 86400 // Cache preflight for 24 hours
}));

// SECURITY: Cookie parser for HttpOnly JWT cookies
app.use(cookieParser());

// SECURITY: Body parsing with strict size limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// SECURITY: Request timeout to prevent DoS via slow requests
app.use((req, res, next) => {
  req.setTimeout(30000, () => {
    res.status(408).json({ error: 'Request timeout' });
  });
  next();
});

// SECURITY: Content-Type validation
app.use(validateContentType);

// SECURITY: Input sanitization - prevents NoSQL injection and XSS
app.use(mongoSanitizeMiddleware);
app.use(xssProtectionMiddleware);

// Request logging (use 'combined' in production for more detail)
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// SECURITY: CSRF Protection using SameSite cookies + Origin validation
// Since we use SameSite=strict cookies, we have strong CSRF protection.
// This adds an additional layer for state-changing operations.
app.use((req, res, next) => {
  // Skip CSRF for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  // Skip CSRF for login/logout (they set/clear the session)
  if (req.path === '/api/auth/login' || req.path === '/api/auth/logout') {
    return next();
  }
  
  // Skip CSRF for password reset (uses one-time token)
  if (req.path.startsWith('/api/auth/password/')) {
    return next();
  }
  
  // For authenticated requests with HttpOnly cookie + SameSite=strict,
  // the browser's SameSite policy provides CSRF protection.
  if (!req.cookies?.accessToken) {
    // Unauthenticated requests don't need CSRF check (they'll fail auth anyway)
    return next();
  }
  
  // SECURITY: Verify Origin/Referer header matches our domain
  const origin = req.get('Origin') || req.get('Referer');
  if (origin && allowedOrigins.length > 0 && process.env.NODE_ENV === 'production') {
    try {
      const originHost = new URL(origin).origin;
      if (!allowedOrigins.includes(originHost)) {
        console.warn(`[SECURITY] CSRF check failed: Origin ${originHost} not in allowed list`);
        return res.status(403).json({ error: 'Invalid request origin' });
      }
    } catch (e) {
      console.warn(`[SECURITY] Invalid origin header: ${origin}`);
    }
  }
  
  next();
});

// General API rate limiting (generous limits)
app.use('/api', apiLimiter);

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

export default app;
