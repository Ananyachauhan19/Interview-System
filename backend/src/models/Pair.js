import mongoose from 'mongoose';

const pairSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  interviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  interviewee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  scheduledAt: Date,
  meetingLink: String,
}, { timestamps: true });

export default mongoose.model('Pair', pairSchema);
