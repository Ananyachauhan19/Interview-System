import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema({
  role: { type: String, enum: ['admin', 'student'], default: 'student' },
  name: String,
  email: { type: String, unique: true, sparse: true },
  studentId: { type: String, unique: true, sparse: true },
  passwordHash: { type: String, required: true },
  mustChangePassword: { type: Boolean, default: false },
  course: String,
  branch: String,
  college: String,
}, { timestamps: true });

userSchema.methods.verifyPassword = async function (pw) {
  return bcrypt.compare(pw, this.passwordHash);
};

userSchema.statics.hashPassword = async function (pw) {
  const saltRounds = Number(process.env.BCRYPT_ROUNDS || 10);
  return bcrypt.hash(pw, saltRounds);
};

export default mongoose.model('User', userSchema);
