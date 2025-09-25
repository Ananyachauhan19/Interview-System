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

export async function loginAdmin(req, res) {
  const { email, password } = req.body;
  const admin = await User.findOne({ email, role: 'admin' });
  if (!admin) throw new HttpError(401, 'Invalid credentials');
  const ok = await admin.verifyPassword(password);
  if (!ok) throw new HttpError(401, 'Invalid credentials');
  const token = signToken({ sub: admin._id, role: admin.role });
  res.json({ token, user: { id: admin._id, email: admin.email, role: admin.role, name: admin.name } });
}

export async function loginStudent(req, res) {
  const { identifier, password } = req.body; // email or studentId
  const student = await User.findOne({
    role: 'student',
    $or: [{ email: identifier }, { studentId: identifier }],
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
