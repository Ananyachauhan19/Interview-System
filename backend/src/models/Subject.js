import mongoose from 'mongoose';

const topicSchema = new mongoose.Schema({
  topicName: { type: String, required: true, trim: true },
  topicVideoLink: { type: String, trim: true },
  notesLink: { type: String, trim: true },
  questionPDF: { type: String, trim: true }, // URL to stored PDF
  difficultyLevel: { 
    type: String, 
    enum: ['easy', 'easy-medium', 'medium', 'medium-hard', 'hard'],
    required: true 
  },
  order: { type: Number, default: 0 }
}, { timestamps: true });

const chapterSchema = new mongoose.Schema({
  chapterName: { type: String, required: true, trim: true },
  importanceLevel: { type: Number, min: 1, max: 5, required: true }, // 1-5 stars
  topics: [topicSchema],
  order: { type: Number, default: 0 }
}, { timestamps: true });

const subjectSchema = new mongoose.Schema({
  subjectName: { type: String, required: true, trim: true },
  subjectDescription: { type: String, trim: true },
  chapters: [chapterSchema],
  order: { type: Number, default: 0 }
}, { timestamps: true });

const semesterSchema = new mongoose.Schema({
  semesterName: { type: String, required: true, trim: true },
  semesterDescription: { type: String, trim: true },
  coordinatorId: { type: String, required: true, index: true }, // Links to coordinator
  subjects: [subjectSchema],
  order: { type: Number, default: 0 }
}, { timestamps: true });

// Index for quick coordinator lookup
semesterSchema.index({ coordinatorId: 1, order: 1 });

const Semester = mongoose.model('Semester', semesterSchema);

export default Semester;
