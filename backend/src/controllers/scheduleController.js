import Pair from '../models/Pair.js';
import SlotProposal from '../models/SlotProposal.js';
import Event from '../models/Event.js';
import SpecialStudent from '../models/SpecialStudent.js';
import { sendMail, buildICS, sendSlotProposalEmail, sendSlotAcceptanceEmail, sendInterviewScheduledEmail } from '../utils/mailer.js';
import { HttpError } from '../utils/errors.js';
import crypto from 'crypto';

// Helper function to format date as "6/11/2025, 12:16:00 PM"
function formatDateTime(date) {
  return new Date(date).toLocaleString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
}

// Helper to check user's role in a pair (handles cross-collection matching for users in both User and SpecialStudent)
async function getUserRoleInPair(pair, user) {
  const userId = user._id.toString();
  const interviewerId = pair.interviewer.toString();
  const intervieweeId = pair.interviewee.toString();
  
  // Direct ID match
  if (userId === interviewerId) {
    return { isInPair: true, isInterviewer: true, effectiveUserId: userId };
  }
  if (userId === intervieweeId) {
    return { isInPair: true, isInterviewer: false, effectiveUserId: userId };
  }
  
  // If user is a regular User, check if they have a SpecialStudent record for special event pairs
  if (!user.isSpecialStudent && user.email) {
    const specialStudent = await SpecialStudent.findOne({
      $or: [
        { email: user.email },
        { studentId: user.studentId }
      ]
    });
    
    if (specialStudent) {
      const specialStudentId = specialStudent._id.toString();
      if (specialStudentId === interviewerId) {
        return { isInPair: true, isInterviewer: true, effectiveUserId: specialStudentId };
      }
      if (specialStudentId === intervieweeId) {
        return { isInPair: true, isInterviewer: false, effectiveUserId: specialStudentId };
      }
    }
  }
  
  // If user is a SpecialStudent, check if they have a User record for regular event pairs
  if (user.isSpecialStudent && user.email) {
    const regularUser = await User.findOne({
      $or: [
        { email: user.email },
        { studentId: user.studentId }
      ]
    });
    
    if (regularUser) {
      const regularUserId = regularUser._id.toString();
      if (regularUserId === interviewerId) {
        return { isInPair: true, isInterviewer: true, effectiveUserId: regularUserId };
      }
      if (regularUserId === intervieweeId) {
        return { isInPair: true, isInterviewer: false, effectiveUserId: regularUserId };
      }
    }
  }
  
  return { isInPair: false, isInterviewer: null, effectiveUserId: null };
}

export async function proposeSlots(req, res) {
  const pair = await Pair.findById(req.params.pairId);
  if (!pair) throw new HttpError(404, 'Pair not found');
  
  // Check if user is part of this pair (handles cross-collection matching)
  const userRole = await getUserRoleInPair(pair, req.user);
  if (!userRole.isInPair) throw new HttpError(403, 'Not your pair');
  
  const { slots } = req.body || {}; // array of ISO strings (optional)
  const isInterviewer = userRole.isInterviewer;
  const effectiveUserId = userRole.effectiveUserId;
  const partnerId = isInterviewer ? pair.interviewee : pair.interviewer;

  // If already scheduled, disallow any further modifications to slots.
  if (pair.status === 'scheduled') {
    if (slots && slots.length > 0) throw new HttpError(400, 'Pair already scheduled; slots can no longer be changed');
    // Read-only fetch still allowed below when no slots provided
  }

  // If no slots provided, return current proposals (read-only for both roles)
  if (!slots || slots.length === 0) {
    const mineDoc = await SlotProposal.findOne({ pair: pair._id, user: effectiveUserId, event: pair.event });
    const partnerDoc = await SlotProposal.findOne({ pair: pair._id, user: partnerId, event: pair.event });
    const mine = (mineDoc?.slots || []).map(d => new Date(d).toISOString());
    const partner = (partnerDoc?.slots || []).map(d => new Date(d).toISOString());
    // find first common
    const partnerSet = new Set(partner.map(d => new Date(d).getTime()));
    const common = mine.map(d => new Date(d).getTime()).find(t => partnerSet.has(t));
    return res.json({ mine, partner, common: common ? new Date(common).toISOString() : null });
  }

  // Validate slots within event window
  const event = await Event.findById(pair.event);
  let startBoundary = event?.startDate ? new Date(event.startDate).getTime() : null;
  let endBoundary = event?.endDate ? new Date(event.endDate).getTime() : null;
  const dates = (slots || []).map((s) => new Date(s));
  if (dates.some(d => isNaN(d.getTime()))) throw new HttpError(400, 'Invalid slot date');
  if (startBoundary && dates.some(d => d.getTime() < startBoundary)) throw new HttpError(400, 'Slot before event start');
  if (endBoundary && dates.some(d => d.getTime() > endBoundary)) throw new HttpError(400, 'Slot after event end');

  // Business rules: interviewer can propose any number; interviewee can propose up to 3 alternatives when requesting change
  if (!isInterviewer && dates.length > 3) {
    throw new HttpError(400, 'Interviewee may propose up to 3 alternative slots');
  }

  const doc = await SlotProposal.findOneAndUpdate(
    { pair: pair._id, user: effectiveUserId, event: pair.event },
    { slots: dates },
    { upsert: true, new: true }
  );

  // Send email notification to the other party
  await pair.populate('interviewer interviewee');
  const isInterviewerProposing = isInterviewer;
  
  if (process.env.EMAIL_ON_PAIRING === 'true') {
    if (isInterviewerProposing && pair.interviewee?.email) {
      // Interviewer proposed slots -> notify interviewee
      const slotsList = dates.map(d => formatDateTime(d)).join(', ');
      await sendSlotProposalEmail({
        to: pair.interviewee.email,
        interviewer: pair.interviewer?.name || pair.interviewer?.email || 'Your interviewer',
        slot: slotsList,
      });
      console.log(`[Email] Slot proposal sent to interviewee: ${pair.interviewee.email}`);
    } else if (!isInterviewerProposing && pair.interviewer?.email) {
      // Interviewee proposed alternative slots -> notify interviewer
      const slotsList = dates.map(d => formatDateTime(d)).join(', ');
      await sendSlotAcceptanceEmail({
        to: pair.interviewer.email,
        interviewee: pair.interviewee?.name || pair.interviewee?.email || 'The interviewee',
        slot: slotsList,
        accepted: false, // This is a new proposal, not acceptance
      });
      console.log(`[Email] New slot proposal sent to interviewer: ${pair.interviewer.email}`);
    }
  }

  // Return both proposals and intersection
  const mineDoc = doc;
  const partnerDoc = await SlotProposal.findOne({ pair: pair._id, user: partnerId, event: pair.event });
  const mine = (mineDoc?.slots || []).map(d => new Date(d).toISOString());
  const partner = (partnerDoc?.slots || []).map(d => new Date(d).toISOString());
  const partnerSet = new Set(partner.map(d => new Date(d).getTime()));
  const common = mine.map(d => new Date(d).getTime()).find(t => partnerSet.has(t));
  res.json({ mine, partner, common: common ? new Date(common).toISOString() : null });
}

export async function confirmSlot(req, res) {
  const pair = await Pair.findById(req.params.pairId);
  if (!pair) throw new HttpError(404, 'Pair not found');
  
  // Check if user is part of this pair (handles cross-collection matching)
  const userRole = await getUserRoleInPair(pair, req.user);
  if (!userRole.isInPair) throw new HttpError(403, 'Not your pair');
  
  // Rule: Either party may confirm, but the chosen time must exist in the OTHER party's proposals.
  const confirmerIsInterviewee = !userRole.isInterviewer;
  const confirmerIsInterviewer = userRole.isInterviewer;
  if (!confirmerIsInterviewee && !confirmerIsInterviewer) throw new HttpError(403, 'Only pair participants can confirm the meeting time');

  if (pair.status === 'scheduled') throw new HttpError(400, 'Pair already scheduled; confirmation cannot be changed');

  const { scheduledAt, meetingLink } = req.body;
  const scheduled = new Date(scheduledAt);
  if (isNaN(scheduled.getTime())) throw new HttpError(400, 'Invalid scheduledAt');

  // Validate the selected time is among the OTHER party's proposed slots
  const otherUserId = confirmerIsInterviewer ? pair.interviewee : pair.interviewer;
  const otherProposal = await SlotProposal.findOne({ pair: pair._id, user: otherUserId, event: pair.event });
  if (!otherProposal || !otherProposal.slots?.length) throw new HttpError(400, 'No slots proposed by the other party to confirm');
  const proposedSet = new Set((otherProposal.slots || []).map((d) => new Date(d).getTime()));
  if (!proposedSet.has(scheduled.getTime())) throw new HttpError(400, 'Selected time is not one of the other party proposed slots');

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
  
  // Send acceptance notification to the other party
  await pair.populate('interviewer interviewee');
  
  if (process.env.EMAIL_ON_PAIRING === 'true') {
    // Use the role we already determined
    if (confirmerIsInterviewee && pair.interviewer?.email) {
      // Interviewee accepted interviewer's proposed slot
      await sendSlotAcceptanceEmail({
        to: pair.interviewer.email,
        interviewee: pair.interviewee?.name || pair.interviewee?.email || 'The interviewee',
        slot: formatDateTime(scheduled),
        accepted: true,
      });
      console.log(`[Email] Slot acceptance sent to interviewer: ${pair.interviewer.email}`);
    } else if (confirmerIsInterviewer && pair.interviewee?.email) {
      // Interviewer confirmed interviewee's proposed slot
      await sendSlotAcceptanceEmail({
        to: pair.interviewee.email,
        interviewee: pair.interviewer?.name || pair.interviewer?.email || 'Your interviewer',
        slot: formatDateTime(scheduled),
        accepted: true,
      });
      console.log(`[Email] Slot confirmation sent to interviewee: ${pair.interviewee.email}`);
    }
  }
  
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
  
  // Build ICS calendar attachment if scheduled
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
  
  // Send professional scheduled email to both parties
  const emails = [pair.interviewer?.email, pair.interviewee?.email].filter(Boolean);
  const event = {
    title: 'Interview Session',
    date: pair.scheduledAt ? formatDateTime(pair.scheduledAt) : 'TBA',
    details: 'Your interview has been scheduled. Please join on time.',
  };
  
  for (const to of emails) {
    await sendInterviewScheduledEmail({
      to,
      interviewer: pair.interviewer?.name || pair.interviewer?.email || 'Interviewer',
      interviewee: pair.interviewee?.name || pair.interviewee?.email || 'Interviewee',
      event,
      link: pair.meetingLink || 'Will be provided soon',
    });
    
    // Also send calendar invite
    if (icsAttachment) {
      await sendMail({ 
        to, 
        subject: 'Calendar Invite - Interview Session', 
        text: 'Please find the calendar invite attached.',
        attachments: icsAttachment 
      });
    }
  }
  
  console.log('[Email] Interview scheduled emails sent to both parties');
}
