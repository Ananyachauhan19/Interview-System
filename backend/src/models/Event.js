import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  startDate: Date,
  endDate: Date,
  capacity: { type: Number, default: null },
  templateUrl: String,
  templateName: String,
  templateKey: String,
  isSpecial: { type: Boolean, default: false },
  allowedParticipants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // whitelist for special events
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  joinDisabled: { type: Boolean, default: false }, // manual disable
  joinDisableTime: { type: Date, default: null }, // scheduled disable
}, { timestamps: true });

export default mongoose.model('Event', eventSchema);
