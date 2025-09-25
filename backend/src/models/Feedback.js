import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  pair: { type: mongoose.Schema.Types.ObjectId, ref: 'Pair', required: true },
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  marks: { type: Number, min: 0, max: 100, required: true },
  comments: String,
}, { timestamps: true });

export default mongoose.model('Feedback', feedbackSchema);
