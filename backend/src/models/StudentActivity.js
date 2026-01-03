import mongoose from 'mongoose';

const studentActivitySchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
    refPath: 'studentModel'
  },
  studentModel: {
    type: String,
    required: true,
    enum: ['User']
  },
  activityType: {
    type: String,
    required: true,
    enum: [
      'LOGIN',
      'VIDEO_WATCH',
      'VIDEO_STARTED',
      'PROBLEM_SOLVED',
      'TOPIC_COMPLETED',
      'TOPIC_VIEWED',
      'CHAPTER_VIEWED',
      'COURSE_ENROLLED',
      'SUBJECT_ACCESSED',
      'SESSION_SCHEDULED',
      'FEEDBACK_SUBMITTED',
      'PROFILE_UPDATED',
      'PASSWORD_CHANGED'
    ]
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  date: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Compound index for efficient date-range queries
studentActivitySchema.index({ studentId: 1, date: 1 });
studentActivitySchema.index({ studentId: 1, activityType: 1 });

export default mongoose.model('StudentActivity', studentActivitySchema);
