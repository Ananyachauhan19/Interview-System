import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const specialStudentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  studentId: { type: String, required: true },
  branch: { type: String, required: true },
  course: String,
  college: String,
  events: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }], // Array of events this student participates in
  // Store original password for reference (already hashed)
  passwordHash: String,
  mustChangePassword: { type: Boolean, default: true },
}, { timestamps: true });

// Index for faster lookups
specialStudentSchema.index({ email: 1 });
specialStudentSchema.index({ studentId: 1 });

// Add password verification method (same as User model)
specialStudentSchema.methods.verifyPassword = async function (pw) {
  return bcrypt.compare(pw, this.passwordHash);
};

// Add static hash method (same as User model)
specialStudentSchema.statics.hashPassword = async function (pw) {
  const saltRounds = Number(process.env.BCRYPT_ROUNDS || 10);
  return bcrypt.hash(pw, saltRounds);
};

export default mongoose.model('SpecialStudent', specialStudentSchema);
