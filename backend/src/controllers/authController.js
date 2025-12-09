import User from '../models/User.js';
import SpecialStudent from '../models/SpecialStudent.js';
import { signToken } from '../utils/jwt.js';
import { HttpError } from '../utils/errors.js';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '../utils/mailer.js';
import { uploadAvatar, deleteAvatar, isCloudinaryConfigured } from '../utils/cloudinary.js';
import { logActivity } from './adminActivityController.js';
import { logStudentActivity } from './activityController.js';

// Change password for student (requires current password)
export async function changePassword(req, res) {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const user = req.user;
  if (!user) throw new HttpError(401, 'Unauthorized');
  
  if (user.role !== 'student' && user.role !== 'coordinator') throw new HttpError(403, 'Only students or coordinators can change password here');
  if (!currentPassword || !newPassword || !confirmPassword) throw new HttpError(400, 'All fields required');
  if (newPassword !== confirmPassword) throw new HttpError(400, 'New passwords do not match');
  if (newPassword.length < 6) throw new HttpError(400, 'New password must be at least 6 characters');
  if (!/[#@]/.test(newPassword)) throw new HttpError(400, 'New password must contain @ or #');
  
  // Verify current password
  const ok = await user.verifyPassword(currentPassword);
  if (!ok) throw new HttpError(401, 'Current password incorrect');
  
  // Update password
  if (user.isSpecialStudent) {
    user.passwordHash = await SpecialStudent.hashPassword(newPassword);
    user.mustChangePassword = false;
    await user.save();
  } else {
    user.passwordHash = await User.hashPassword(newPassword);
    user.mustChangePassword = false;
    await user.save();
  }
  
  // Log activity
  logActivity({
    userEmail: user.email,
    userRole: user.role,
    actionType: 'UPDATE',
    targetType: user.role === 'student' ? 'STUDENT' : 'COORDINATOR',
    targetId: user._id.toString(),
    description: `Changed password`,
    metadata: {},
    req
  });
  
  res.json({ message: 'Password changed successfully' });
}

// Change password for admin (requires current password) - Separate logic for admin
export async function changeAdminPassword(req, res) {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const user = req.user;
  if (!user) throw new HttpError(401, 'Unauthorized');
  
  // Verify user is admin
  if (user.role !== 'admin') throw new HttpError(403, 'Only admins can use this endpoint');
  
  // Validate input
  if (!currentPassword || !newPassword || !confirmPassword) throw new HttpError(400, 'All fields required');
  if (newPassword !== confirmPassword) throw new HttpError(400, 'New passwords do not match');
  if (newPassword.length < 6) throw new HttpError(400, 'New password must be at least 6 characters');
  if (!/[#@]/.test(newPassword)) throw new HttpError(400, 'New password must contain @ or #');
  
  // Verify current password
  const ok = await user.verifyPassword(currentPassword);
  if (!ok) throw new HttpError(401, 'Current password incorrect');
  
  // Update admin password in database
  user.passwordHash = await User.hashPassword(newPassword);
  user.mustChangePassword = false;
  await user.save();
  
  console.log(`[Admin Password Change] Password updated for admin: ${user.email}`);
  
  // Log activity
  logActivity({
    userEmail: user.email,
    userRole: user.role,
    actionType: 'UPDATE',
    targetType: 'ADMIN',
    targetId: user._id.toString(),
    description: `Changed admin password`,
    metadata: {},
    req
  });
  
  res.json({ message: 'Admin password changed successfully', email: user.email });
}
<<<<<<< Updated upstream
||||||| Stash base
import User from '../models/User.js';
import SpecialStudent from '../models/SpecialStudent.js';
import { signToken } from '../utils/jwt.js';
import { HttpError } from '../utils/errors.js';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '../utils/mailer.js';
import { uploadAvatar, deleteAvatar, isCloudinaryConfigured } from '../utils/cloudinary.js';
=======
import User from '../models/User.js';
import SpecialStudent from '../models/SpecialStudent.js';
import { signToken } from '../utils/jwt.js';
import { HttpError } from '../utils/errors.js';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '../utils/mailer.js';
import { uploadAvatar, deleteAvatar, isCloudinaryConfigured } from '../utils/cloudinary.js';
import { logActivity } from './adminActivityController.js';
import { logStudentActivity } from './activityController.js';
>>>>>>> Stashed changes

export async function seedAdminIfNeeded() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;
  const emailLower = String(email).trim().toLowerCase();
  const existing = await User.findOne({ role: 'admin', email: emailLower });
  if (existing) {
    if (String(process.env.ADMIN_FORCE_RESET).toLowerCase() === 'true') {
      existing.passwordHash = await User.hashPassword(password);
      existing.mustChangePassword = false;
      await existing.save();
      console.log('[Admin Seed] Existing admin password reset from ENV for', emailLower);
    }
    return;
  }
  const passwordHash = await User.hashPassword(password);
  await User.create({ role: 'admin', email: emailLower, name: 'Admin', passwordHash, mustChangePassword: false });
  console.log('[Admin Seed] Admin user seeded for', emailLower);
}

export function me(req, res) {
  const u = req.user;
  if (!u) return res.status(401).json({ error: 'Unauthorized' });
  // Return fields based on role
  const response = { 
    _id: u._id, 
    email: u.email, 
    name: u.name, 
    role: u.role, 
    avatarUrl: u.avatarUrl 
  };
  
  // Add role-specific fields
  if (u.role === 'student') {
    response.studentId = u.studentId;
    response.course = u.course;
    response.branch = u.branch;
    response.college = u.college;
    response.teacherId = u.teacherId;
    response.semester = u.semester;
  } else if (u.role === 'coordinator') {
    response.teacherId = u.coordinatorId; // Coordinators use coordinatorId as their teacherId
    response.coordinatorId = u.coordinatorId;
    response.department = u.department;
    response.college = u.college;
  }
  
  res.json(response);
}

// Update current student's profile (name, course, branch, college)
export async function updateMe(req, res) {
  const u = req.user;
  if (!u) return res.status(401).json({ error: 'Unauthorized' });
  // Only students (regular or special) can update profile
  if (u.role !== 'student') return res.status(403).json({ error: 'Only students can update profile' });
  const { name, course, branch, college } = req.body || {};
  // Basic validation: strings only, trim
  const trim = (v) => (typeof v === 'string' ? v.trim() : undefined);
  const updates = {
    ...(name !== undefined ? { name: trim(name) } : {}),
    ...(course !== undefined ? { course: trim(course) } : {}),
    ...(branch !== undefined ? { branch: trim(branch) } : {}),
    ...(college !== undefined ? { college: trim(college) } : {}),
  };
  // Persist on underlying model (User or SpecialStudent)
  Object.assign(u, updates);
  await u.save();
  
  // Log activity
  logActivity({
    userEmail: u.email,
    userRole: u.role,
    actionType: 'UPDATE',
    targetType: 'STUDENT',
    targetId: u._id.toString(),
    description: `Updated profile`,
    metadata: updates,
    req
  });
  
  res.json({ message: 'Profile updated', user: { _id: u._id, name: u.name, email: u.email, studentId: u.studentId, course: u.course, branch: u.branch, college: u.college } });
}

// Upload/update current user's avatar image
export async function updateMyAvatar(req, res) {
  const u = req.user;
  if (!u) return res.status(401).json({ error: 'Unauthorized' });
  if (u.role !== 'student' && u.role !== 'coordinator' && u.role !== 'admin') {
    return res.status(403).json({ error: 'Not allowed' });
  }
  
  const file = req.file; // expecting multer to populate
  if (!file) throw new HttpError(400, 'Avatar file is required');
  
  if (!isCloudinaryConfigured()) {
    throw new HttpError(500, 'Cloudinary not configured');
  }
  
  // Determine folder based on role
  const folder = u.role === 'student' ? 'student_profile' : 'teacher_profile';
  
  try {
    // Delete old avatar if exists
    if (u.avatarUrl) {
      await deleteAvatar(u.avatarUrl);
    }
    
    // Upload new avatar to Cloudinary
    const avatarUrl = await uploadAvatar(file.buffer, folder, u._id.toString());
    
    // Save on user document (works for User and SpecialStudent via req.user)
    u.avatarUrl = avatarUrl;
    await u.save();
    
<<<<<<< Updated upstream
    // Log activity
    logActivity({
      userEmail: u.email,
      userRole: u.role,
      actionType: 'UPDATE',
      targetType: u.role === 'student' ? 'STUDENT' : u.role === 'coordinator' ? 'COORDINATOR' : 'ADMIN',
      targetId: u._id.toString(),
      description: `Updated avatar`,
      metadata: {},
      req
    });
    
    // Log student activity for profile update
    if (u.role === 'student') {
      const studentModel = u.isSpecialStudent ? 'SpecialStudent' : 'User';
      await logStudentActivity({
        studentId: u._id,
        studentModel: studentModel,
        activityType: 'PROFILE_UPDATED',
        metadata: { action: 'avatar_updated' }
      });
    }
    
||||||| Stash base
=======
    // Log activity
    logActivity({
      userEmail: u.email,
      userRole: u.role,
      actionType: 'UPDATE',
      targetType: u.role === 'student' ? 'STUDENT' : u.role === 'coordinator' ? 'COORDINATOR' : 'ADMIN',
      targetId: u._id.toString(),
      description: `Updated avatar`,
      metadata: {},
      req
    });
    
>>>>>>> Stashed changes
    res.json({ message: 'Avatar updated', avatarUrl });
  } catch (e) {
    console.error('[Avatar Upload Error]', e);
    throw new HttpError(500, 'Failed to upload avatar: ' + (e.message || e));
  }
}

// Unified login: accepts either admin email or student email / studentId as 'identifier' (or legacy 'email')
export async function login(req, res) {
  const { identifier, email, password } = req.body;
  const id = (identifier || email || '').trim();
  if (!id || !password) throw new HttpError(400, 'Missing credentials');

  // Try admin first (by email only)
  const idLower = id.toLowerCase();
  const admin = await User.findOne({ role: 'admin', email: idLower });
  if (admin) {
    const ok = await admin.verifyPassword(password);
    if (!ok) throw new HttpError(401, 'Invalid credentials');
    const token = signToken({ sub: admin._id, role: admin.role, email: admin.email });
    return res.json({ token, user: { id: admin._id, email: admin.email, role: admin.role, name: admin.name } });
  }

  // Try regular student by email OR studentId
  const student = await User.findOne({
    role: 'student',
    $or: [{ email: idLower }, { studentId: id }],
  });
  if (student) {
    const ok = await student.verifyPassword(password);
    if (!ok) throw new HttpError(401, 'Invalid credentials');
    
    // Log student login activity
    await logStudentActivity({
      studentId: student._id,
      studentModel: 'User',
      activityType: 'LOGIN',
      metadata: { email: student.email, studentId: student.studentId }
    });
    
    const token = signToken({ 
      sub: student._id, 
      role: student.role,
      email: student.email,
      studentId: student.studentId
    });
    return res.json({ token, user: sanitizeUser(student) });
  }

  // Try coordinator by email only
  const coordinator = await User.findOne({ role: 'coordinator', email: idLower });
  if (coordinator) {
    const ok = await coordinator.verifyPassword(password);
    if (!ok) throw new HttpError(401, 'Invalid credentials');
    const token = signToken({ sub: coordinator._id, role: coordinator.role, email: coordinator.email });
    return res.json({ token, user: sanitizeUser(coordinator) });
  }

  // Try special student by email OR studentId
  const specialStudent = await SpecialStudent.findOne({
    $or: [{ email: idLower }, { studentId: id }],
  });
  if (specialStudent) {
    const ok = await specialStudent.verifyPassword(password);
    if (!ok) throw new HttpError(401, 'Invalid credentials');
    
    // Log special student login activity
    await logStudentActivity({
      studentId: specialStudent._id,
      studentModel: 'SpecialStudent',
      activityType: 'LOGIN',
      metadata: { email: specialStudent.email, studentId: specialStudent.studentId }
    });
    
    const token = signToken({ 
      sub: specialStudent._id, 
      role: 'student', 
      isSpecial: true,
      email: specialStudent.email,
      studentId: specialStudent.studentId
    });
    return res.json({ 
      token, 
      user: {
        id: specialStudent._id,
        role: 'student',
        name: specialStudent.name,
        email: specialStudent.email,
        studentId: specialStudent.studentId,
        mustChangePassword: specialStudent.mustChangePassword,
        course: specialStudent.course,
        branch: specialStudent.branch,
        college: specialStudent.college,
        isSpecialStudent: true,
      }
    });
  }

  // No match found
  throw new HttpError(401, 'Invalid credentials');
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

// Request password reset - generates token and sends email
export async function requestPasswordReset(req, res) {
  const { email } = req.body;
  if (!email) throw new HttpError(400, 'Email or Student ID is required');

  const identifier = email.trim().toLowerCase();
  
  // Search by email or studentId
  const user = await User.findOne({
    role: 'student',
    $or: [
      { email: identifier },
      { studentId: identifier }
    ]
  });
  
  // Always return success to prevent email enumeration
  if (!user) {
    return res.json({ message: 'If an account exists with this email or student ID, a password reset link has been sent.' });
  }

  // Check if user has an email address
  if (!user.email) {
    return res.json({ message: 'If an account exists with this email or student ID, a password reset link has been sent.' });
  }

  // Generate reset token (valid for 1 hour)
  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
  
  user.passwordResetToken = resetTokenHash;
  user.passwordResetExpires = Date.now() + 3600000; // 1 hour
  await user.save();

  // Send email with reset link - support multiple frontend ports
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
  
  console.log('[Password Reset] Reset URL generated:', resetUrl);
  
  try {
    await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetUrl,
    });
    console.log('[Password Reset] Email sent successfully to:', user.email);
  } catch (err) {
    console.error('Failed to send password reset email:', err);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    throw new HttpError(500, 'Failed to send reset email. Please try again later.');
  }

  res.json({ message: 'If an account exists with this email or student ID, a password reset link has been sent.' });
}

// Reset password using token
export async function resetPassword(req, res) {
  try {
    const { token, newPassword } = req.body;
    
    console.log('[Password Reset] Attempting to reset password with token:', token ? token.substring(0, 10) + '...' : 'none');
    
    if (!token || !newPassword) throw new HttpError(400, 'Token and new password are required');
    if (newPassword.length < 8) throw new HttpError(400, 'Password must be at least 8 characters');
    if (!/[#*]/.test(newPassword)) throw new HttpError(400, 'Password must contain * or #');

    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    const user = await User.findOne({
      passwordResetToken: resetTokenHash,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      console.log('[Password Reset] No user found with valid token');
      throw new HttpError(400, 'Invalid or expired reset token');
    }

    console.log('[Password Reset] User found, updating password for:', user.email);

    user.passwordHash = await User.hashPassword(newPassword);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.mustChangePassword = false;
    await user.save();

    console.log('[Password Reset] Password reset successful for:', user.email);
    res.json({ message: 'Password has been reset successfully' });
  } catch (err) {
    console.error('[Password Reset] Error:', err.message);
    throw err;
  }
}
