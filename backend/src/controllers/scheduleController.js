import Pair from '../models/Pair.js';
import SlotProposal from '../models/SlotProposal.js';
import Event from '../models/Event.js';
import User from '../models/User.js';
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

// Time window restrictions
const ALLOWED_START_HOUR = 10; // inclusive
const ALLOWED_END_HOUR = 22;  // exclusive

function isWithinAllowedHours(d) {
  if (!d) return false;
  const h = d.getHours();
  return h >= ALLOWED_START_HOUR && h < ALLOWED_END_HOUR;
}

function validateSlots(dates) {
  const now = Date.now();
  for (const d of dates) {
    if (d.getTime() <= now) throw new HttpError(400, 'Cannot use past time slot');
    if (!isWithinAllowedHours(d)) throw new HttpError(400, 'Slot must be between 10:00 and 22:00');
  }
}

// Helper to check user's role in a pair (handles cross-collection matching for users in both User and SpecialStudent)
async function getUserRoleInPair(pair, user) {
  const userId = user._id.toString();
  
  // Handle both populated objects and ObjectId references
  const interviewerId = pair.interviewer?._id ? pair.interviewer._id.toString() : pair.interviewer?.toString();
  const intervieweeId = pair.interviewee?._id ? pair.interviewee._id.toString() : pair.interviewee?.toString();
  
  if (!interviewerId || !intervieweeId) {
    console.error('[getUserRoleInPair] Pair missing interviewer or interviewee:', { 
      pairId: pair._id, 
      hasInterviewer: !!pair.interviewer, 
      hasInterviewee: !!pair.interviewee 
    });
    return { isInPair: false, isInterviewer: null, effectiveUserId: null };
  }
  
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
  let pair = await Pair.findById(req.params.pairId);
  if (!pair) throw new HttpError(404, 'Pair not found');
  
  // Get event to determine type
  const event = await Event.findById(pair.event);
  const isSpecialEvent = event?.isSpecial;
  
  // Set model types if missing (backward compatibility)
  if (!pair.interviewerModel || !pair.intervieweeModel) {
    const modelType = isSpecialEvent ? 'SpecialStudent' : 'User';
    pair.interviewerModel = modelType;
    pair.intervieweeModel = modelType;
    await pair.save();
  }
  
  // Store the raw IDs before population attempt
  const rawInterviewerId = pair.interviewer;
  const rawIntervieweeId = pair.interviewee;
  
  // Try to populate
  pair = await Pair.findById(req.params.pairId)
    .populate('interviewer')
    .populate('interviewee');
  
  // If population failed (still an ObjectId, not an object with _id), manually fetch
  const Model = isSpecialEvent ? SpecialStudent : User;
  
  if (!pair.interviewer || !pair.interviewer._id) {
    console.log(`[proposeSlots] Manually fetching interviewer from ${Model.modelName}`);
    pair.interviewer = await Model.findById(rawInterviewerId);
  }
  if (!pair.interviewee || !pair.interviewee._id) {
    console.log(`[proposeSlots] Manually fetching interviewee from ${Model.modelName}`);
    pair.interviewee = await Model.findById(rawIntervieweeId);
  }
  
  // Check if user is part of this pair (handles cross-collection matching)
  const userRole = await getUserRoleInPair(pair, req.user);
  if (!userRole.isInPair) throw new HttpError(403, 'Not your pair');
  
  const { slots } = req.body || {}; // array of ISO strings (optional)
  const isInterviewer = userRole.isInterviewer;
  const effectiveUserId = userRole.effectiveUserId;
  const partnerId = isInterviewer ? pair.interviewee?._id : pair.interviewer?._id;

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
  let startBoundary = event?.startDate ? new Date(event.startDate).getTime() : null;
  let endBoundary = event?.endDate ? new Date(event.endDate).getTime() : null;
  const dates = (slots || []).map((s) => new Date(s));
  if (dates.some(d => isNaN(d.getTime()))) throw new HttpError(400, 'Invalid slot date');
  // Time-of-day + future validation
  if (dates.length) validateSlots(dates);
  if (startBoundary && dates.some(d => d.getTime() < startBoundary)) throw new HttpError(400, 'Slot before event start');
  if (endBoundary && dates.some(d => d.getTime() > endBoundary)) throw new HttpError(400, 'Slot after event end');

  // Business rule: BOTH parties may have at most 3 proposed slots in total.
  if (dates.length > 3) throw new HttpError(400, 'May propose at most 3 slots');

  // Append unique slots to existing list without overriding; cap at 3 total
  const existingDoc = await SlotProposal.findOne({ pair: pair._id, user: effectiveUserId, event: pair.event });
  let existing = (existingDoc?.slots || []).map(d => new Date(d));
  // Build a set of timestamps for uniqueness
  const existingSet = new Set(existing.map(d => d.getTime()));
  const additions = [];
  for (const d of dates) {
    const ts = d.getTime();
    if (!existingSet.has(ts)) {
      additions.push(d);
      existingSet.add(ts);
    }
  }
  const combined = [...existing, ...additions];
  if (combined.length > 3) {
    throw new HttpError(400, 'Maximum number of proposals (3) already reached');
  }
  // Sort ascending for consistency
  combined.sort((a, b) => a.getTime() - b.getTime());

  const doc = await SlotProposal.findOneAndUpdate(
    { pair: pair._id, user: effectiveUserId, event: pair.event },
    { slots: combined },
    { upsert: true, new: true }
  );

  // Send email notification to the other party
  const isInterviewerProposing = isInterviewer;
  
  // Always send slot proposal/acceptance emails (part of the 4-email flow)
  if (isInterviewerProposing && pair.interviewee?.email) {
    // Interviewer proposed slots -> notify interviewee
    const slotsList = dates.map(d => formatDateTime(d)).join(' | '); // Use | as separator to avoid comma conflict
    await sendSlotProposalEmail({
      to: pair.interviewee.email,
      interviewer: pair.interviewer?.name || pair.interviewer?.email || 'Your interviewer',
      slot: slotsList,
    });
    console.log(`[Email] Slot proposal sent to interviewee: ${pair.interviewee.email}`);
  } else if (!isInterviewerProposing && pair.interviewer?.email) {
    // Interviewee proposed alternative slots -> notify interviewer
    const slotsList = dates.map(d => formatDateTime(d)).join(' | '); // Use | as separator to avoid comma conflict
    await sendSlotAcceptanceEmail({
      to: pair.interviewer.email,
      interviewee: pair.interviewee?.name || pair.interviewee?.email || 'The interviewee',
      slot: slotsList,
      accepted: false, // This is a new proposal, not acceptance
    });
    console.log(`[Email] New slot proposal sent to interviewer: ${pair.interviewer.email}`);
  }

  // Return both proposals and intersection
  const mineDoc = doc;
  const partnerDoc = await SlotProposal.findOne({ pair: pair._id, user: partnerId, event: pair.event });
  // Mark expired slots
  const nowTs = Date.now();
  const mineSlotsRaw = (mineDoc?.slots || []).map(d => new Date(d));
  const partnerSlotsRaw = (partnerDoc?.slots || []).map(d => new Date(d));
  const mine = mineSlotsRaw.map(d => d.toISOString());
  const partner = partnerSlotsRaw.map(d => d.toISOString());
  const mineMeta = mineSlotsRaw.map(d => ({ slot: d.toISOString(), expired: d.getTime() <= nowTs }));
  const partnerMeta = partnerSlotsRaw.map(d => ({ slot: d.toISOString(), expired: d.getTime() <= nowTs }));
  const partnerSet = new Set(partner.map(d => new Date(d).getTime()));
  const common = mine.map(d => new Date(d).getTime()).find(t => partnerSet.has(t) && t > nowTs);
  res.json({ mine, partner, common: common ? new Date(common).toISOString() : null, mineMeta, partnerMeta });
}

export async function confirmSlot(req, res) {
  let pair = await Pair.findById(req.params.pairId);
  if (!pair) throw new HttpError(404, 'Pair not found');
  
  // Get event to determine type
  const event = await Event.findById(pair.event);
  const isSpecialEvent = event?.isSpecial;
  
  // Set model types if missing (backward compatibility)
  if (!pair.interviewerModel || !pair.intervieweeModel) {
    const modelType = isSpecialEvent ? 'SpecialStudent' : 'User';
    pair.interviewerModel = modelType;
    pair.intervieweeModel = modelType;
    await pair.save();
  }
  
  // Store the raw IDs before population attempt
  const rawInterviewerId = pair.interviewer;
  const rawIntervieweeId = pair.interviewee;
  
  // Try to populate
  pair = await Pair.findById(req.params.pairId)
    .populate('interviewer')
    .populate('interviewee');
  
  // If population failed, manually fetch
  const Model = isSpecialEvent ? SpecialStudent : User;
  
  if (!pair.interviewer || !pair.interviewer._id) {
    pair.interviewer = await Model.findById(rawInterviewerId);
  }
  if (!pair.interviewee || !pair.interviewee._id) {
    pair.interviewee = await Model.findById(rawIntervieweeId);
  }
  
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
  if (scheduled.getTime() <= Date.now()) throw new HttpError(400, 'Cannot confirm past time');
  if (!isWithinAllowedHours(scheduled)) throw new HttpError(400, 'Scheduled time must be between 10:00 and 22:00');

  // Validate the selected time is among the OTHER party's proposed slots
  const otherUserId = confirmerIsInterviewer ? pair.interviewee?._id : pair.interviewer?._id;
  const otherProposal = await SlotProposal.findOne({ pair: pair._id, user: otherUserId, event: pair.event });
  if (!otherProposal || !otherProposal.slots?.length) throw new HttpError(400, 'No slots proposed by the other party to confirm');
  const proposedSet = new Set((otherProposal.slots || []).map((d) => new Date(d).getTime()));
  if (!proposedSet.has(scheduled.getTime())) throw new HttpError(400, 'Selected time is not one of the other party proposed slots');

  // Enforce event window on confirmation too
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
  // Always send slot acceptance emails (part of the 4-email flow)
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
  
  // notify both with interview scheduled email
  await sendMailForPair(pair);
  res.json(pair);
}

export async function rejectSlots(req, res) {
  let pair = await Pair.findById(req.params.pairId);
  if (!pair) throw new HttpError(404, 'Pair not found');
  
  // Get event to determine type
  const event = await Event.findById(pair.event);
  const isSpecialEvent = event?.isSpecial;
  
  // Set model types if missing (backward compatibility)
  if (!pair.interviewerModel || !pair.intervieweeModel) {
    const modelType = isSpecialEvent ? 'SpecialStudent' : 'User';
    pair.interviewerModel = modelType;
    pair.intervieweeModel = modelType;
    await pair.save();
  }
  
  // Store the raw IDs before population attempt
  const rawInterviewerId = pair.interviewer;
  const rawIntervieweeId = pair.interviewee;
  
  // Try to populate
  pair = await Pair.findById(req.params.pairId)
    .populate('interviewer')
    .populate('interviewee');
  
  // If population failed, manually fetch
  const Model = isSpecialEvent ? SpecialStudent : User;
  
  if (!pair.interviewer || !pair.interviewer._id) {
    pair.interviewer = await Model.findById(rawInterviewerId);
  }
  if (!pair.interviewee || !pair.interviewee._id) {
    pair.interviewee = await Model.findById(rawIntervieweeId);
  }
    
  if (!req.user._id.equals(pair.interviewee?._id)) throw new HttpError(403, 'Only interviewee can reject');
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
  if (!pair || !pair.scheduledAt) return;
  
  // Build ICS calendar attachment if scheduled
  let icsAttachment;
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
  
  // Prepare event details
  const event = {
    title: 'Interview Session',
    date: formatDateTime(pair.scheduledAt),
    details: 'Your interview has been scheduled. Please join on time.',
  };
  
  // Create email promises for both parties
  const emailPromises = [];
  
  // Add scheduled interview email promises
  [pair.interviewer, pair.interviewee].forEach(participant => {
    if (!participant?.email) return;
    
    // Add interview details email
    emailPromises.push(
      sendInterviewScheduledEmail({
        to: participant.email,
        interviewer: pair.interviewer?.name || pair.interviewer?.email || 'Interviewer',
        interviewee: pair.interviewee?.name || pair.interviewee?.email || 'Interviewee',
        event,
        link: pair.meetingLink || 'Will be provided soon',
      }).catch(err => {
        console.error(`[sendMailForPair] Failed to send interview details to ${participant.email}:`, err.message);
        return null;
      })
    );
    
    // Add calendar invite
    emailPromises.push(
      sendMail({ 
        to: participant.email, 
        subject: 'Calendar Invite - Interview Session', 
        text: 'Please find the calendar invite attached.',
        attachments: icsAttachment 
      }).catch(err => {
        console.error(`[sendMailForPair] Failed to send calendar invite to ${participant.email}:`, err.message);
        return null;
      })
    );
  });
  
  // Send all emails in parallel
  await Promise.all(emailPromises);
  console.log('[Email] Interview scheduled emails and calendar invites sent to both parties');
}
