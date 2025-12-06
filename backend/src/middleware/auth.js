import { verifyToken } from '../utils/jwt.js';
import User from '../models/User.js';
import SpecialStudent from '../models/SpecialStudent.js';
import { HttpError } from '../utils/errors.js';

export async function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) throw new HttpError(401, 'Missing token');
  const payload = verifyToken(token);
  
  // Check if it's a special student token
  if (payload.isSpecial) {
    const specialStudent = await SpecialStudent.findById(payload.sub);
    if (!specialStudent) throw new HttpError(401, 'User not found');
    // Make it look like a regular user object for middleware compatibility
    req.user = specialStudent;
    req.user.role = 'student';
    req.user.isSpecialStudent = true;
    return next();
  }
  
  // Regular user
  const user = await User.findById(payload.sub);
  if (!user) throw new HttpError(401, 'User not found');
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
