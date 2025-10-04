import Event from '../models/Event.js';
import Pair from '../models/Pair.js';
import mongoose from 'mongoose';
import { sendMail, renderTemplate } from '../utils/mailer.js';
import { HttpError } from '../utils/errors.js';
// meeting link is already hidden until 1 hour prior in listPairs

export async function generatePairs(req, res) {
  const event = await Event.findById(req.params.id).populate('participants');
  if (!event) throw new HttpError(404, 'Event not found');
  const ids = event.participants.map((s) => s._id.toString());
  if (ids.length < 2) throw new HttpError(400, 'Not enough participants');
  // Rotation rule: i -> (i+1) % N
  const pairs = ids.map((id, i) => [id, ids[(i + 1) % ids.length]]);
  // Persist pairs (replace any existing)
  await Pair.deleteMany({ event: event._id });
  const created = await Pair.insertMany(pairs.map(([a, b]) => ({ event: event._id, interviewer: a, interviewee: b })));

  // Notify students
  if (process.env.EMAIL_ON_PAIRING === 'true') {
    const byId = new Map(event.participants.map((s) => [s._id.toString(), s]));
    const fe = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
    for (const p of created) {
      const a = byId.get(p.interviewer.toString());
      const b = byId.get(p.interviewee.toString());
      if (a?.email) {
        const text = [
          `Hi ${a.name || a.email},`,
          `You are the interviewer for: ${b?.name || b?.email}.`,
          b?.email ? `Their email: ${b.email}` : null,
          `Propose time slots from your dashboard: ${fe}/`,
        ].filter(Boolean).join('\n');
        await sendMail({ to: a.email, subject: `Pairing info: You interview ${b?.name || b?.email || 'a peer'}`, text });
      }
      if (b?.email) {
        const text = [
          `Hi ${b.name || b.email},`,
          `You will be interviewed by: ${a?.name || a?.email}.`,
          a?.email ? `Their email: ${a.email}` : null,
          `Review and accept slots from your dashboard: ${fe}/`,
        ].filter(Boolean).join('\n');
        await sendMail({ to: b.email, subject: `Pairing info: You are interviewed by ${a?.name || a?.email || 'a peer'}`, text });
      }
    }
  }

  res.json({ count: created.length, pairs: created });
}

export async function listPairs(req, res) {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new HttpError(400, 'Invalid event id');
  }

  // Optional existence check to provide clearer 404 vs empty result
  const exists = await Event.exists({ _id: id });
  if (!exists) throw new HttpError(404, 'Event not found');

  let query = { event: id };
  // If not admin, restrict to pairs where user is interviewer or interviewee
  if (req.user?.role !== 'admin') {
    query = { event: id, $or: [{ interviewer: req.user._id }, { interviewee: req.user._id }] };
  }

  let pairs;
  try {
    pairs = await Pair.find(query).populate('interviewer interviewee').lean();
  } catch (e) {
    // Add lightweight diagnostics (safe) to help track unexpected failures
    console.error('[listPairs] query failed', { eventId: id, user: req.user?._id?.toString(), error: e.message });
    throw e; // propagate to error handler
  }

  const now = Date.now();
  const oneHourMs = 60 * 60 * 1000;
  const sanitized = pairs.map((p) => ({ ...p, status: p.status || 'pending' }));
  res.json(sanitized);
}

export async function setMeetingLink(req, res) {
  // Admin sets or updates meeting link; only allowed within 1 hour before start
  if (req.user?.role !== 'admin') throw new HttpError(403, 'Admin only');
  const { pairId } = req.params;
  const { meetingLink } = req.body;
  const pair = await Pair.findById(pairId).populate('interviewer interviewee');
  if (!pair) throw new HttpError(404, 'Pair not found');
  if (!pair.scheduledAt) throw new HttpError(400, 'Pair not scheduled yet');
  const now = Date.now();
  const showAt = new Date(pair.scheduledAt).getTime() - 60 * 60 * 1000;
  if (now < showAt) throw new HttpError(400, 'Cannot set meeting link earlier than 1 hour before scheduled time');
  pair.meetingLink = meetingLink;
  await pair.save();
  // Email both parties with generated link
  const subject = 'Meeting link available';
  const text = `Your interview at ${pair.scheduledAt.toISOString()} now has a meeting link: ${meetingLink}`;
  for (const to of [pair.interviewer?.email, pair.interviewee?.email].filter(Boolean)) {
    await sendMail({ to, subject, text });
  }
  res.json({ message: 'Link set', pairId: pair._id });
}
