import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema({
  role: { type: String, enum: ['admin', 'student', 'coordinator'], default: 'student' },
  name: String,
  email: { type: String, unique: true, sparse: true },
  studentId: { type: String, unique: true, sparse: true },
  coordinatorId: { type: String, unique: true, sparse: true },
  teacherId: String, // For students: links to coordinator's coordinatorID
  passwordHash: { type: String, required: true },
  mustChangePassword: { type: Boolean, default: false },
  course: String,
  branch: String,
  college: String,
  semester: { type: Number, min: 1, max: 8 }, // Required for students: current semester (1-8)
  group: String, // Student group (e.g., G1, G2, A, B, etc.)
  
  // SECURITY: Password reset tokens with expiration and single-use
  passwordResetToken: String,
  passwordResetExpires: Date,
  passwordResetUsed: { type: Boolean, default: false }, // Prevent token reuse
  passwordChangedAt: Date, // Track when password was last changed
  
  // SECURITY: Account lockout fields to prevent brute force attacks
  loginAttempts: { type: Number, default: 0 },
  lockUntil: Date,
  
  // SECURITY: Email verification
  emailVerified: { type: Boolean, default: false },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  
  // Additional fields
  avatarUrl: String,
  department: String, // For coordinators
}, { timestamps: true });

// SECURITY: Virtual property to check if account is locked
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

userSchema.methods.verifyPassword = async function (pw) {
  return bcrypt.compare(pw, this.passwordHash);
};

userSchema.statics.hashPassword = async function (pw) {
  const saltRounds = Number(process.env.BCRYPT_ROUNDS || 10);
  return bcrypt.hash(pw, saltRounds);
};

// SECURITY: Increment login attempts and lock if necessary
userSchema.methods.incLoginAttempts = async function() {
  const MAX_LOGIN_ATTEMPTS = 5;
  const LOCK_TIME = 15 * 60 * 1000; // 15 minutes
  
  // If lockUntil has expired, reset attempts
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }
  
  // Increment attempts
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock the account if we've reached max attempts
  if (this.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + LOCK_TIME };
  }
  
  return this.updateOne(updates);
};

// SECURITY: Reset login attempts on successful login
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 }
  });
};

// SECURITY: Invalidate password reset tokens when password changes
userSchema.pre('save', function(next) {
  if (this.isModified('passwordHash') && !this.isNew) {
    // Password was changed - invalidate all reset tokens
    this.passwordChangedAt = new Date();
    this.passwordResetToken = undefined;
    this.passwordResetExpires = undefined;
    this.passwordResetUsed = true;
  }
  next();
});

export default mongoose.model('User', userSchema);
