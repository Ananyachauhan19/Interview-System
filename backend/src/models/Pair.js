import mongoose from 'mongoose';

const pairSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  interviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  interviewee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  scheduledAt: Date,
  meetingLink: String,
  status: { type: String, enum: ['pending', 'rejected', 'scheduled'], default: 'pending' },
  rejectionCount: { type: Number, default: 0 },
  rejectionHistory: [{
    at: { type: Date, default: Date.now },
    reason: String,
  }],
  lastRejectedAt: Date,
}, { timestamps: true });

export default mongoose.model('Pair', pairSchema);
