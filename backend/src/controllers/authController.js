// Change password for student (requires current password)
export async function changePassword(req, res) {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const user = req.user;
  if (!user) throw new HttpError(401, 'Unauthorized');
  if (user.role !== 'student') throw new HttpError(403, 'Only students can change password here');
  if (!currentPassword || !newPassword || !confirmPassword) throw new HttpError(400, 'All fields required');
  if (newPassword !== confirmPassword) throw new HttpError(400, 'New passwords do not match');
  if (newPassword.length < 6) throw new HttpError(400, 'New password must be at least 6 characters');
  if (!/[#@]/.test(newPassword)) throw new HttpError(400, 'New password must contain @ or #');
  const ok = await user.verifyPassword(currentPassword);
  if (!ok) throw new HttpError(401, 'Current password incorrect');
  user.passwordHash = await User.hashPassword(newPassword);
  user.mustChangePassword = false;
  await user.save();
  res.json({ message: 'Password changed' });
}
import User from '../models/User.js';
import { signToken } from '../utils/jwt.js';
import { HttpError } from '../utils/errors.js';

export async function seedAdminIfNeeded() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;
  const existing = await User.findOne({ email });
  if (existing) return;
  const passwordHash = await User.hashPassword(password);
  await User.create({ role: 'admin', email, name: 'Admin', passwordHash, mustChangePassword: false });
  console.log('Admin user seeded');
}

export function me(req, res) {
  const u = req.user;
  if (!u) return res.status(401).json({ error: 'Unauthorized' });
  // Limit fields returned
  res.json({ _id: u._id, email: u.email, name: u.name, role: u.role, studentId: u.studentId });
}

// Unified login: accepts either admin email or student email / studentId as 'identifier' (or legacy 'email')
export async function login(req, res) {
  const { identifier, email, password } = req.body;
  const id = (identifier || email || '').trim();
  if (!id || !password) throw new HttpError(400, 'Missing credentials');

  // Try admin first (by email only)
  const admin = await User.findOne({ role: 'admin', email: id });
  if (admin) {
    const ok = await admin.verifyPassword(password);
    if (!ok) throw new HttpError(401, 'Invalid credentials');
    const token = signToken({ sub: admin._id, role: admin.role });
    return res.json({ token, user: { id: admin._id, email: admin.email, role: admin.role, name: admin.name } });
  }

  // Else attempt student by email OR studentId
  const student = await User.findOne({
    role: 'student',
    $or: [{ email: id }, { studentId: id }],
  });
  if (!student) throw new HttpError(401, 'Invalid credentials');
  const ok = await student.verifyPassword(password);
  if (!ok) throw new HttpError(401, 'Invalid credentials');
  const token = signToken({ sub: student._id, role: student.role });
  res.json({ token, user: sanitizeUser(student) });
}

export async function forcePasswordChange(req, res) {
  const { newPassword } = req.body;
  const user = req.user;
  if (!user.mustChangePassword) return res.json({ message: 'No change required' });
  user.passwordHash = await User.hashPassword(newPassword);
  user.mustChangePassword = false;
  await user.save();
  res.json({ message: 'Password updated' });
}

function sanitizeUser(u) {
  return {
    id: u._id,
    role: u.role,
    name: u.name,
    email: u.email,
    studentId: u.studentId,
    mustChangePassword: u.mustChangePassword,
    course: u.course,
    branch: u.branch,
    college: u.college,
  };
}
