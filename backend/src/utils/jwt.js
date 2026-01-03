import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// SECURITY: Validate JWT secret strength at startup
const JWT_SECRET = process.env.JWT_SECRET;

function validateJwtSecret() {
  if (!JWT_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SECURITY FATAL: JWT_SECRET environment variable is required in production');
    }
    console.warn('⚠️  WARNING: JWT_SECRET not set. Using insecure default for development only!');
    return 'dev-insecure-secret-do-not-use-in-production';
  }
  
  // Check for common weak secrets
  const weakSecrets = [
    'secret', 'password', 'jwt_secret', 'change-me', 'changeme', 
    'dev-secret', 'test', '123456', 'admin', 'jwt'
  ];
  
  if (weakSecrets.includes(JWT_SECRET.toLowerCase())) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SECURITY FATAL: JWT_SECRET is using a common/weak value. Use a strong random secret.');
    }
    console.warn('⚠️  WARNING: JWT_SECRET is weak. Use a strong secret (min 32 chars) in production!');
  }
  
  // Check minimum length
  if (JWT_SECRET.length < 32) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SECURITY FATAL: JWT_SECRET must be at least 32 characters in production');
    }
    console.warn('⚠️  WARNING: JWT_SECRET is too short. Use at least 32 characters in production!');
  }
  
  // Check entropy (simple check - at least some variety in characters)
  const uniqueChars = new Set(JWT_SECRET).size;
  if (uniqueChars < 10 && process.env.NODE_ENV === 'production') {
    throw new Error('SECURITY FATAL: JWT_SECRET has low entropy. Use a more random secret.');
  }
  
  return JWT_SECRET;
}

const VALIDATED_SECRET = validateJwtSecret();

// SECURITY: Token expiration - configurable but with safe defaults
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h'; // Default 24 hours
const JWT_ISSUER = process.env.JWT_ISSUER || 'interview-system';

export function signToken(payload, opts = {}) {
  // SECURITY: Always set expiration, issuer, and issued-at
  const options = {
    expiresIn: JWT_EXPIRES_IN,
    issuer: JWT_ISSUER,
    ...opts
  };
  
  // Add issued-at timestamp for token invalidation after password change
  const tokenPayload = {
    ...payload,
    iat: Math.floor(Date.now() / 1000)
  };
  
  return jwt.sign(tokenPayload, VALIDATED_SECRET, options);
}

export function verifyToken(token) {
  // SECURITY: Verify with issuer validation
  return jwt.verify(token, VALIDATED_SECRET, {
    issuer: JWT_ISSUER,
    algorithms: ['HS256'] // Only allow expected algorithm
  });
}
