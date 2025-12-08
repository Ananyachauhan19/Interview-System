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
  department: String, // For coordinators
  college: String,
  semester: { type: Number, min: 1, max: 8 }, // Required for students: current semester (1-8)
  passwordResetToken: String,
  passwordResetExpires: Date,
  avatarUrl: String, // Profile picture URL
}, { timestamps: true });

userSchema.methods.verifyPassword = async function (pw) {
  return bcrypt.compare(pw, this.passwordHash);
};

userSchema.statics.hashPassword = async function (pw) {
  const saltRounds = Number(process.env.BCRYPT_ROUNDS || 10);
  return bcrypt.hash(pw, saltRounds);
};

export default mongoose.model('User', userSchema);
