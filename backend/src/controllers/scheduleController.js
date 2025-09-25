import Pair from '../models/Pair.js';
import SlotProposal from '../models/SlotProposal.js';
import { sendMail } from '../utils/mailer.js';
import { HttpError } from '../utils/errors.js';

export async function proposeSlots(req, res) {
  const pair = await Pair.findById(req.params.pairId);
  if (!pair) throw new HttpError(404, 'Pair not found');
  if (![pair.interviewer.toString(), pair.interviewee.toString()].includes(req.user._id.toString())) throw new HttpError(403, 'Not your pair');
  const { slots } = req.body; // array of ISO strings
  const dates = (slots || []).map((s) => new Date(s));
  const doc = await SlotProposal.findOneAndUpdate(
    { pair: pair._id, user: req.user._id, event: pair.event },
    { slots: dates },
    { upsert: true, new: true }
  );
  // Check intersection with partner
  const partnerId = req.user._id.equals(pair.interviewer) ? pair.interviewee : pair.interviewer;
  const partner = await SlotProposal.findOne({ pair: pair._id, user: partnerId });
  if (partner) {
    const setA = new Set(doc.slots.map((d) => d.getTime()));
    const common = partner.slots.find((d) => setA.has(d.getTime()));
    if (common) return res.json({ proposed: doc.slots, common: common.toISOString() });
  }
  res.json({ proposed: doc.slots });
}

export async function confirmSlot(req, res) {
  const pair = await Pair.findById(req.params.pairId);
  if (!pair) throw new HttpError(404, 'Pair not found');
  if (![pair.interviewer.toString(), pair.interviewee.toString()].includes(req.user._id.toString())) throw new HttpError(403, 'Not your pair');
  const { scheduledAt, meetingLink } = req.body;
  pair.scheduledAt = new Date(scheduledAt);
  pair.meetingLink = meetingLink || pair.meetingLink || '';
  await pair.save();
  // notify both
  await sendMailForPair(pair);
  res.json(pair);
}

async function sendMailForPair(pair) {
  await pair.populate('interviewer interviewee');
  const subject = `Interview scheduled at ${pair.scheduledAt?.toISOString()}`;
  const text = `Meeting link: ${pair.meetingLink || 'TBA'}`;
  const emails = [pair.interviewer?.email, pair.interviewee?.email].filter(Boolean);
  for (const to of emails) await sendMail({ to, subject, text });
}
