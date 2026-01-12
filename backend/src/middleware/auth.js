import { verifyToken } from '../utils/jwt.js';
import User from '../models/User.js';
import { HttpError } from '../utils/errors.js';

/**
 * SECURITY: JWT Authentication from HttpOnly Cookies
 * 
 * Reads JWT from HttpOnly cookie instead of Authorization header
 * This protects against XSS token theft.
 * 
 * WHY SAFE: Preserves all authentication logic, only changes token source
 * Falls back to Authorization header for backwards compatibility during migration
 */
export async function requireAuth(req, res, next) {
  // SECURITY: Try to read token from HttpOnly cookie first (preferred)
  let token = req.cookies?.accessToken;
  
  // Fallback to Authorization header for backwards compatibility
  if (!token) {
    const auth = req.headers.authorization || '';
    token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  }
  
  if (!token) throw new HttpError(401, 'Missing token');
  
  const payload = verifyToken(token);

  // All tokens now resolve to the unified User model
  const user = await User.findById(payload.sub);
  if (!user) throw new HttpError(401, 'User not found');
  
  // SECURITY: Check if password was changed after token was issued
  // This invalidates sessions after password change
  if (user.passwordChangedAt && payload.iat) {
    const passwordChangedTime = Math.floor(user.passwordChangedAt.getTime() / 1000);
    if (payload.iat < passwordChangedTime) {
      // Token was issued before password change - invalidate session
      throw new HttpError(401, 'Session expired. Please login again.');
    }
  }
  
  // SECURITY: Single device login check for students
  // Verify session token matches the active session
  if (user.role === 'student' && payload.sessionToken) {
    if (!user.activeSessionToken || user.activeSessionToken !== payload.sessionToken) {
      // Session was invalidated - user logged in from another device
      throw new HttpError(401, 'Session expired. You have logged in from another device.');
    }
  }
  
  req.user = user;
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') throw new HttpError(403, 'Admin only');
  next();
}

export function requireAdminOrCoordinator(req, res, next) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'coordinator')) {
    throw new HttpError(403, 'Admin or Coordinator only');
  }
  next();
}

export function requireStudent(req, res, next) {
  if (!req.user || req.user.role !== 'student') throw new HttpError(403, 'Student only');
  next();
}

export function requireCoordinator(req, res, next) {
  if (!req.user || req.user.role !== 'coordinator') throw new HttpError(403, 'Coordinator only');
  next();
}
