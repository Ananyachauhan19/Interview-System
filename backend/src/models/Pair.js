import mongoose from 'mongoose';

const pairSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  interviewer: { type: mongoose.Schema.Types.ObjectId, refPath: 'interviewerModel', required: true },
  interviewee: { type: mongoose.Schema.Types.ObjectId, refPath: 'intervieweeModel', required: true },
  interviewerModel: { type: String, enum: ['User', 'SpecialStudent'], default: 'User' },
  intervieweeModel: { type: String, enum: ['User', 'SpecialStudent'], default: 'User' },
  scheduledAt: Date,
  finalConfirmedTime: Date,
  meetingLink: String,
  status: { type: String, enum: ['pending', 'rejected', 'scheduled', 'completed'], default: 'pending' },
  interviewerProposalCount: { type: Number, default: 0 },
  intervieweeProposalCount: { type: Number, default: 0 },
  rejectionCount: { type: Number, default: 0 },
  rejectionHistory: [{
    at: { type: Date, default: Date.now },
    reason: String,
  }],
  lastRejectedAt: Date,
}, { timestamps: true });

// Middleware to auto-detect and set model types for existing pairs that don't have them
pairSchema.pre('save', async function(next) {
  // Only run if model types are not set (backward compatibility)
  if (!this.interviewerModel || !this.intervieweeModel) {
    // Check if this is a special event
    const Event = mongoose.model('Event');
    const event = await Event.findById(this.event).lean();
    
    if (event?.isSpecial) {
      this.interviewerModel = 'SpecialStudent';
      this.intervieweeModel = 'SpecialStudent';
    } else {
      this.interviewerModel = 'User';
      this.intervieweeModel = 'User';
    }
  }
  next();
});

export default mongoose.model('Pair', pairSchema);
