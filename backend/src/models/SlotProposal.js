import mongoose from 'mongoose';

const slotProposalSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  pair: { type: mongoose.Schema.Types.ObjectId, ref: 'Pair', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  slots: [{ type: Date }],
}, { timestamps: true });

slotProposalSchema.index({ event: 1, pair: 1, user: 1 }, { unique: true });

export default mongoose.model('SlotProposal', slotProposalSchema);
