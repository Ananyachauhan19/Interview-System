import { verifyToken } from '../utils/jwt.js';
import User from '../models/User.js';
import { HttpError } from '../utils/errors.js';

export async function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) throw new HttpError(401, 'Missing token');
  const payload = verifyToken(token);
  const user = await User.findById(payload.sub);
  if (!user) throw new HttpError(401, 'User not found');
  req.user = user;
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') throw new HttpError(403, 'Admin only');
  next();
}
