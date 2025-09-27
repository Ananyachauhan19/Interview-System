import Feedback from '../models/Feedback.js';
import Pair from '../models/Pair.js';
import Event from '../models/Event.js';
import User from '../models/User.js';
import { HttpError } from '../utils/errors.js';

// Only interviewer can submit feedback about the interviewee.
// Feedback allowed after the scheduled interview time (if set) OR after event end.
export async function submitFeedback(req, res) {
  const { pairId, marks, comments } = req.body;
  if (marks == null || isNaN(marks)) throw new HttpError(400, 'Marks required');
  const pair = await Pair.findById(pairId);
  if (!pair) throw new HttpError(404, 'Pair not found');
  // Enforce interviewer role
  if (!pair.interviewer.equals(req.user._id)) {
    throw new HttpError(403, 'Only the interviewer can submit feedback');
  }
  const event = await Event.findById(pair.event);
  if (!event) throw new HttpError(404, 'Event not found');
  const now = Date.now();
  const scheduled = pair.scheduledAt ? new Date(pair.scheduledAt).getTime() : null;
  const eventEnd = event.endDate ? new Date(event.endDate).getTime() : null;
  if (!( (scheduled && now > scheduled) || (eventEnd && now > eventEnd) )) {
    throw new HttpError(400, 'Feedback not allowed before session completes');
  }
  const to = pair.interviewee; // receiver always interviewee
  // Block duplicate submissions
  const existing = await Feedback.findOne({ event: pair.event, pair: pair._id, from: req.user._id, to });
  if (existing) throw new HttpError(400, 'Feedback already submitted for this session');
  const fb = await Feedback.findOneAndUpdate(
    { event: pair.event, pair: pair._id, from: req.user._id, to },
    { marks, comments },
    { upsert: true, new: true }
  );
  res.json(fb);
}

// Admin listing with optional filtering by college (interviewee college) and eventId
export async function listFeedback(req, res) {
  const { college, eventId } = req.query;
  const filter = {};
  if (eventId) filter.event = eventId;
  if (college) {
    const users = await User.find({ college: new RegExp(`^${college}$`, 'i') }, '_id');
    const ids = users.map(u => u._id);
    // Only match feedback whose receiver (interviewee) matches college
    filter.to = { $in: ids };
  }
  const list = await Feedback.find(filter)
    .populate('from to event pair');
  res.json(list.map(f => ({
    id: f._id,
    eventId: f.event?._id,
    event: f.event?.name,
    pair: f.pair?._id,
    interviewer: f.from?.name || f.from?.email,
    interviewee: f.to?.name || f.to?.email,
    intervieweeCollege: f.to?.college,
    marks: f.marks,
    comments: f.comments,
    submittedAt: f.createdAt,
  })));
}

export async function exportEventFeedback(req, res) {
  const eventId = req.params.id;
  const event = await Event.findById(eventId);
  if (!event) throw new HttpError(404, 'Event not found');
  const list = await Feedback.find({ event: eventId }).populate('from to');
  const header = 'event,interviewer,interviewee,marks,comments\n';
  const rows = list.map((f) => [
    event.name,
    f.from?.name || f.from?.email || f.from?._id,
    f.to?.name || f.to?.email || f.to?._id,
    f.marks,
    JSON.stringify(f.comments || ''),
  ].join(','));
  const csv = header + rows.join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="event_${eventId}_feedback.csv"`);
  res.send(csv);
}

// Export filtered feedback (admin) honoring same filters as listFeedback
export async function exportFilteredFeedback(req, res) {
  const { college, eventId } = req.query;
  const filter = {};
  if (eventId) filter.event = eventId;
  if (college) {
    const users = await User.find({ college: new RegExp(`^${college}$`, 'i') }, '_id');
    const ids = users.map(u => u._id);
    filter.to = { $in: ids };
  }
  const list = await Feedback.find(filter).populate('from to event');
  const header = 'event,interviewer,interviewee,college,marks,comments,submittedAt\n';
  const rows = list.map(f => [
    (f.event?.name || ''),
    (f.from?.name || f.from?.email || f.from?._id || ''),
    (f.to?.name || f.to?.email || f.to?._id || ''),
    (f.to?.college || ''),
    (f.marks ?? ''),
    JSON.stringify(f.comments || ''),
    f.createdAt ? new Date(f.createdAt).toISOString() : ''
  ].join(','));
  const csv = header + rows.join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="feedback_filtered.csv"');
  res.send(csv);
}

// Auth user: list their submitted feedback (optionally filter by eventId) for UI gating
export async function listMyFeedback(req, res) {
  const { eventId } = req.query;
  const filter = { from: req.user._id };
  if (eventId) filter.event = eventId;
  const list = await Feedback.find(filter, 'pair event createdAt').lean();
  res.json(list.map(f => ({ pair: f.pair, event: f.event, submittedAt: f.createdAt })));
}
