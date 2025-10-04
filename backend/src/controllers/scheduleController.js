import Pair from '../models/Pair.js';
import SlotProposal from '../models/SlotProposal.js';
import Event from '../models/Event.js';
import { sendMail, buildICS } from '../utils/mailer.js';
import { HttpError } from '../utils/errors.js';
import crypto from 'crypto';

export async function proposeSlots(req, res) {
  const pair = await Pair.findById(req.params.pairId);
  if (!pair) throw new HttpError(404, 'Pair not found');
  if (![pair.interviewer.toString(), pair.interviewee.toString()].includes(req.user._id.toString())) throw new HttpError(403, 'Not your pair');
  const { slots } = req.body || {}; // array of ISO strings (optional)
  const isInterviewer = req.user._id.equals(pair.interviewer);
  const partnerId = pair.interviewee; // interviewer proposes, interviewee is partner

  // If already scheduled, disallow any further modifications to slots.
  if (pair.status === 'scheduled') {
    if (slots && slots.length > 0) throw new HttpError(400, 'Pair already scheduled; slots can no longer be changed');
    // Read-only fetch still allowed below when no slots provided
  }

  // Only interviewer can propose (business rule update)
  if (!isInterviewer) {
    // Read-only fetch allowed for interviewee
    if (!slots || slots.length === 0) {
      const interviewerProposalRO = await SlotProposal.findOne({ pair: pair._id, user: pair.interviewer, event: pair.event });
      return res.json({
        mine: [],
        partner: (interviewerProposalRO?.slots || []).map(d => new Date(d).toISOString()),
        common: null,
      });
    }
    throw new HttpError(403, 'Only interviewer can propose slots');
  }

  // If no slots provided, return current proposals (read-only)
  if (!slots || slots.length === 0) {
    const mine = await SlotProposal.findOne({ pair: pair._id, user: pair.interviewer, event: pair.event });
    return res.json({
      mine: (mine?.slots || []).map(d => new Date(d).toISOString()),
      partner: [],
      common: null,
    });
  }

  // Validate slots within event window
  const event = await Event.findById(pair.event);
  let startBoundary = event?.startDate ? new Date(event.startDate).getTime() : null;
  let endBoundary = event?.endDate ? new Date(event.endDate).getTime() : null;
  const dates = (slots || []).map((s) => new Date(s));
  if (dates.some(d => isNaN(d.getTime()))) throw new HttpError(400, 'Invalid slot date');
  if (startBoundary && dates.some(d => d.getTime() < startBoundary)) throw new HttpError(400, 'Slot before event start');
  if (endBoundary && dates.some(d => d.getTime() > endBoundary)) throw new HttpError(400, 'Slot after event end');
  const doc = await SlotProposal.findOneAndUpdate(
    { pair: pair._id, user: req.user._id, event: pair.event },
    { slots: dates },
    { upsert: true, new: true }
  );

  // Check intersection with partner
  res.json({ proposed: doc.slots.map((d) => new Date(d).toISOString()) });
}

export async function confirmSlot(req, res) {
  const pair = await Pair.findById(req.params.pairId);
  if (!pair) throw new HttpError(404, 'Pair not found');
  if (![pair.interviewer.toString(), pair.interviewee.toString()].includes(req.user._id.toString())) throw new HttpError(403, 'Not your pair');
  // Rule: Only interviewee can confirm a time.
  if (!req.user._id.equals(pair.interviewee)) throw new HttpError(403, 'Only the interviewee can confirm the meeting time');

  if (pair.status === 'scheduled') throw new HttpError(400, 'Pair already scheduled; confirmation cannot be changed');

  const { scheduledAt, meetingLink } = req.body;
  const scheduled = new Date(scheduledAt);
  if (isNaN(scheduled.getTime())) throw new HttpError(400, 'Invalid scheduledAt');

  // Validate the selected time is among the interviewer proposed slots
  const interviewerProposal = await SlotProposal.findOne({ pair: pair._id, user: pair.interviewer, event: pair.event });
  if (!interviewerProposal || !interviewerProposal.slots?.length) throw new HttpError(400, 'No interviewer slots available to confirm');
  const proposedSet = new Set((interviewerProposal.slots || []).map((d) => new Date(d).getTime()));
  if (!proposedSet.has(scheduled.getTime())) throw new HttpError(400, 'Selected time is not one of the interviewer proposed slots');

  // Enforce event window on confirmation too
  const event = await Event.findById(pair.event);
  if (event?.startDate && scheduled.getTime() < new Date(event.startDate).getTime()) throw new HttpError(400, 'Scheduled time before event start');
  if (event?.endDate && scheduled.getTime() > new Date(event.endDate).getTime()) throw new HttpError(400, 'Scheduled time after event end');

  pair.scheduledAt = scheduled;
  // Auto-generate a Jitsi meet link if none provided yet.
  if (meetingLink) {
    pair.meetingLink = meetingLink;
  } else if (!pair.meetingLink) {
    const base = (process.env.MEETING_LINK_BASE || 'https://meet.jit.si').replace(/\/$/, '');
    const room = `Interview-${pair._id}-${crypto.randomBytes(3).toString('hex')}`; // 6 hex chars
    pair.meetingLink = `${base}/${room}`;
  }
  pair.status = 'scheduled';
  await pair.save();
  // notify both
  await sendMailForPair(pair);
  res.json(pair);
}

export async function rejectSlots(req, res) {
  const pair = await Pair.findById(req.params.pairId);
  if (!pair) throw new HttpError(404, 'Pair not found');
  if (!req.user._id.equals(pair.interviewee)) throw new HttpError(403, 'Only interviewee can reject');
  if (pair.status === 'scheduled') throw new HttpError(400, 'Pair already scheduled; cannot reject now');
  const { reason } = req.body || {};
  // Cooldown: max 2 rejections per 2 hours
  const now = Date.now();
  if (pair.lastRejectedAt && (now - new Date(pair.lastRejectedAt).getTime()) < (30 * 60 * 1000)) {
    throw new HttpError(429, 'Please wait before rejecting again (30 min cooldown).');
  }
  if (pair.rejectionCount >= 5) {
    throw new HttpError(400, 'Maximum number of rejections reached');
  }
  // Delete existing proposals for this pair to force re-proposal
  await SlotProposal.deleteMany({ pair: pair._id });
  pair.scheduledAt = undefined;
  pair.meetingLink = undefined;
  pair.status = 'rejected';
  pair.rejectionCount = (pair.rejectionCount || 0) + 1;
  pair.lastRejectedAt = new Date();
  pair.rejectionHistory = pair.rejectionHistory || [];
  pair.rejectionHistory.push({ at: new Date(), reason: reason || '' });
  await pair.save();
  // Notify interviewer
  await pair.populate('interviewer interviewee');
  if (pair.interviewer?.email) {
    await sendMail({
      to: pair.interviewer.email,
      subject: 'Interview slots rejected',
      text: `${pair.interviewee?.name || pair.interviewee?.email} rejected the proposed slots.${reason ? ` Reason: ${reason}` : ''} Please propose new times.`,
    });
  }
  res.json({ message: 'Rejected. Interviewer must propose new slots.' });
}

async function sendMailForPair(pair) {
  await pair.populate('interviewer interviewee');
  const when = pair.scheduledAt?.toISOString();
  const subject = `Interview scheduled${when ? ` at ${when}` : ''}`;
  const text = [
    `Interviewer: ${pair.interviewer?.name || pair.interviewer?.email}`,
    pair.interviewer?.email ? `Interviewer email: ${pair.interviewer.email}` : null,
    `Interviewee: ${pair.interviewee?.name || pair.interviewee?.email}`,
    pair.interviewee?.email ? `Interviewee email: ${pair.interviewee.email}` : null,
    `Meeting link: ${pair.meetingLink || 'TBA'}`,
  ].filter(Boolean).join('\n');
  let icsAttachment;
  if (pair.scheduledAt) {
    const end = new Date(new Date(pair.scheduledAt).getTime() + 30 * 60 * 1000); // default 30 min
    const ics = buildICS({
      uid: `${pair._id}@interview-system`,
      start: pair.scheduledAt,
      end,
      summary: 'Interview Session',
      description: 'Scheduled interview session',
      url: pair.meetingLink,
      organizer: { name: pair.interviewer?.name || 'Interviewer', email: pair.interviewer?.email },
      attendees: [
        { name: pair.interviewer?.name || 'Interviewer', email: pair.interviewer?.email },
        { name: pair.interviewee?.name || 'Interviewee', email: pair.interviewee?.email },
      ].filter(a => a.email),
    });
    icsAttachment = [{ filename: 'interview.ics', content: ics, contentType: 'text/calendar; charset=utf-8; method=REQUEST' }];
  }
  const emails = [pair.interviewer?.email, pair.interviewee?.email].filter(Boolean);
  for (const to of emails) await sendMail({ to, subject, text, attachments: icsAttachment });
}
