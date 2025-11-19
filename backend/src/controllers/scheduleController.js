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

// Generate a random future slot inside allowed window and within event boundaries (if any)
function generateRandomSlot(event) {
  const now = new Date();
  const startBoundary = event?.startDate ? new Date(event.startDate) : null;
  const endBoundary = event?.endDate ? new Date(event.endDate) : null;

  const base = startBoundary && startBoundary.getTime() > now.getTime() ? new Date(startBoundary) : new Date(now);
  base.setSeconds(0, 0);

  for (let i = 0; i < 50; i++) {
    const dayOffset = Math.floor(Math.random() * 7); // within next 7 days to avoid far future
    const d = new Date(base);
    d.setDate(d.getDate() + dayOffset);
    const hour = Math.floor(Math.random() * (ALLOWED_END_HOUR - ALLOWED_START_HOUR)) + ALLOWED_START_HOUR;
    const minute = Math.floor(Math.random() * 60);
    d.setHours(hour, minute, 0, 0);
    if (d.getTime() <= now.getTime()) continue;
    if (!isWithinAllowedHours(d)) continue;
    if (startBoundary && d.getTime() < startBoundary.getTime()) continue;
    if (endBoundary && d.getTime() > endBoundary.getTime()) continue;
    return d;
  }
  // Fallback: next valid day start within window and boundaries
  let fallback = new Date(base);
  if (fallback.getHours() >= ALLOWED_END_HOUR) {
    fallback.setDate(fallback.getDate() + 1);
  }
  fallback.setHours(ALLOWED_START_HOUR, 0, 0, 0);
  if (startBoundary && fallback.getTime() < startBoundary.getTime()) fallback = new Date(startBoundary);
  if (fallback.getHours() < ALLOWED_START_HOUR) fallback.setHours(ALLOWED_START_HOUR, 0, 0, 0);
  if (fallback.getHours() >= ALLOWED_END_HOUR) {
    fallback.setDate(fallback.getDate() + 1);
    fallback.setHours(ALLOWED_START_HOUR, 0, 0, 0);
  }
  if (endBoundary && fallback.getTime() > endBoundary.getTime()) {
    // As a last resort, just return endBoundary minus 1 hour if within window
    const end = new Date(endBoundary);
    end.setHours(Math.min(Math.max(ALLOWED_START_HOUR, end.getHours() - 1), ALLOWED_END_HOUR - 1), 0, 0, 0);
    return end;
  }
  return fallback;
}

async function checkAndAutoAssign(pair) {
  if (!pair) return false;
  if (pair.status === 'scheduled') return false;
  const ip = pair.interviewerProposalCount || 0;
  const ep = pair.intervieweeProposalCount || 0;
  if (ip < 3 || ep < 3) return false;
  // Both hit limits; auto-assign a time
  const event = await Event.findById(pair.event);
  const slot = generateRandomSlot(event);
  if (!slot || slot.getTime() <= Date.now()) return false;

  pair.scheduledAt = slot;
  pair.finalConfirmedTime = slot;
  if (!pair.meetingLink) {
    const base = (process.env.MEETING_LINK_BASE || 'https://meet.jit.si').replace(/\/$/, '');
    const room = `Interview-${pair._id}-${crypto.randomBytes(3).toString('hex')}`;
    pair.meetingLink = `${base}/${room}`;
  }
  pair.status = 'scheduled';
  await pair.save();

  try {
    const populated = await Pair.findById(pair._id).populate('interviewer').populate('interviewee');
    const whenStr = formatDateTime(slot);
    const emails = [populated?.interviewer?.email, populated?.interviewee?.email].filter(Boolean);
    await Promise.all(emails.map(to => sendMail({
      to,
      subject: 'Auto-Assigned Interview Time',
      text: `Both participants reached the proposal limit. A time was auto-assigned for your interview: ${whenStr}. Meeting link: ${pair.meetingLink}`,
    }).catch(() => null)));
  } catch {}

  try {
    await sendMailForPair(pair);
  } catch (e) {
    console.error('[auto-assign] Failed to send scheduled emails:', e?.message);
  }
  return true;
}

async function expireProposalsIfNeeded(pair) {
  const now = Date.now();
  const users = [pair.interviewer, pair.interviewee];
  let movedSomething = false;
  for (const uid of users) {
    const doc = await SlotProposal.findOne({ pair: pair._id, user: uid, event: pair.event });
    if (!doc || !doc.slots?.length) continue;
    const latest = new Date(doc.slots[doc.slots.length - 1]).getTime();
    if (latest <= now) {
      const moved = doc.slots.pop();
      doc.pastSlots = doc.pastSlots || [];
      doc.pastEntries = doc.pastEntries || [];
      doc.pastSlots.push(moved);
      doc.pastEntries.push({ time: moved, reason: 'expired' });
      await doc.save();
      movedSomething = true;
      try {
        // Notify both parties about expiration
        const populated = await Pair.findById(pair._id).populate('interviewer').populate('interviewee');
        const emails = [populated?.interviewer?.email, populated?.interviewee?.email].filter(Boolean);
        const whenStr = formatDateTime(moved);
        await Promise.all(emails.map(to => sendMail({
          to,
          subject: 'Suggested Interview Time Expired',
          text: `The previously suggested time (${whenStr}) has passed without approval. Please propose a new time.`
        }).catch(() => null)));
      } catch {}
    }
  }
  if (movedSomething) {
    try { await checkAndAutoAssign(pair); } catch {}
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
  // Expire any passed active proposals before proceeding
  await expireProposalsIfNeeded(pair);
  
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
    const minePast = (mineDoc?.pastSlots || []).map(d => new Date(d).toISOString());
    const partnerPast = (partnerDoc?.pastSlots || []).map(d => new Date(d).toISOString());
    // find first common
    const partnerSet = new Set(partner.map(d => new Date(d).getTime()));
    const common = mine.map(d => new Date(d).getTime()).find(t => partnerSet.has(t));
    return res.json({ mine, partner, minePast, partnerPast, common: common ? new Date(common).toISOString() : null });
  }

  // Validate slots within event window
  let startBoundary = event?.startDate ? new Date(event.startDate).getTime() : null;
  let endBoundary = event?.endDate ? new Date(event.endDate).getTime() : null;
  const dates = (slots || []).map((s) => new Date(s));
  if (dates.some(d => isNaN(d.getTime()))) throw new HttpError(400, 'Invalid slot date');
  // Accept exactly one active slot per proposal
  if (dates.length !== 1) throw new HttpError(400, 'Provide exactly one slot');
  // Time-of-day + future validation
  validateSlots(dates);
  if (startBoundary && dates.some(d => d.getTime() < startBoundary)) throw new HttpError(400, 'Slot before event start');
  if (endBoundary && dates.some(d => d.getTime() > endBoundary)) throw new HttpError(400, 'Slot after event end');

  // Only one active slot per user; can propose only if no active exists
  let doc = await SlotProposal.findOne({ pair: pair._id, user: effectiveUserId, event: pair.event });
  if (doc?.slots?.length) {
    throw new HttpError(400, 'You already have a pending proposal. Wait for acceptance/rejection.');
  }
  const pastCount = (doc?.pastSlots?.length || 0);
  // Enforce per-role proposal counters
  const isInterviewerProposing = isInterviewer;
  const maxReached = isInterviewerProposing ? (pair.interviewerProposalCount >= 3) : (pair.intervieweeProposalCount >= 3);
  if (maxReached) throw new HttpError(400, 'Maximum number of proposals (3) already reached');
  if (!doc) doc = new SlotProposal({ pair: pair._id, user: effectiveUserId, event: pair.event, slots: [], pastSlots: [] });
  doc.slots = [dates[0]];
  await doc.save();
  // Increment per-user counters on pair
  if (isInterviewerProposing) pair.interviewerProposalCount = (pair.interviewerProposalCount || 0) + 1; else pair.intervieweeProposalCount = (pair.intervieweeProposalCount || 0) + 1;
  await pair.save();

  // If both reached max attempts and still not scheduled, auto-assign and skip proposal email
  let autoAssigned = false;
  try { autoAssigned = await checkAndAutoAssign(pair); } catch {}

  // Send email notification to the other party (only if not auto-assigned)
  
  
  // Always send slot proposal/acceptance emails (part of the 4-email flow)
  if (!autoAssigned && isInterviewerProposing && pair.interviewee?.email) {
    // Interviewer proposed slots -> notify interviewee
    const slotsList = dates.map(d => formatDateTime(d)).join(' | '); // Use | as separator to avoid comma conflict
    await sendSlotProposalEmail({
      to: pair.interviewee.email,
      interviewer: pair.interviewer?.name || pair.interviewer?.email || 'Your interviewer',
      slot: slotsList,
    });
    console.log(`[Email] Slot proposal sent to interviewee: ${pair.interviewee.email}`);
  } else if (!autoAssigned && !isInterviewerProposing && pair.interviewer?.email) {
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
  const mineDoc = await SlotProposal.findOne({ pair: pair._id, user: effectiveUserId, event: pair.event });
  const partnerDoc = await SlotProposal.findOne({ pair: pair._id, user: partnerId, event: pair.event });
  // Mark expired slots
  const nowTs = Date.now();
  const mineSlotsRaw = (mineDoc?.slots || []).map(d => new Date(d));
  const partnerSlotsRaw = (partnerDoc?.slots || []).map(d => new Date(d));
  const mine = mineSlotsRaw.map(d => d.toISOString());
  const partner = partnerSlotsRaw.map(d => d.toISOString());
  const minePast = (mineDoc?.pastSlots || []).map(d => new Date(d).toISOString());
  const partnerPast = (partnerDoc?.pastSlots || []).map(d => new Date(d).toISOString());
  const minePastEntries = (mineDoc?.pastEntries || []).map(e => ({ time: new Date(e.time).toISOString(), reason: e.reason }));
  const partnerPastEntries = (partnerDoc?.pastEntries || []).map(e => ({ time: new Date(e.time).toISOString(), reason: e.reason }));
  const pastTimeSlots = [...minePastEntries, ...partnerPastEntries]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  const mineMeta = mineSlotsRaw.map(d => ({ slot: d.toISOString(), expired: d.getTime() <= nowTs }));
  const partnerMeta = partnerSlotsRaw.map(d => ({ slot: d.toISOString(), expired: d.getTime() <= nowTs }));
  const partnerSet = new Set(partner.map(d => new Date(d).getTime()));
  const common = mine.map(d => new Date(d).getTime()).find(t => partnerSet.has(t) && t > nowTs);
  res.json({ mine, partner, minePast, partnerPast, minePastEntries, partnerPastEntries, pastTimeSlots, common: common ? new Date(common).toISOString() : null, mineMeta, partnerMeta });
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

  // Validate the selected time equals the OTHER party's latest proposed slot (only latest is actionable)
  const otherUserId = confirmerIsInterviewer ? pair.interviewee?._id : pair.interviewer?._id;
  const otherProposal = await SlotProposal.findOne({ pair: pair._id, user: otherUserId, event: pair.event });
  if (!otherProposal || !otherProposal.slots?.length) throw new HttpError(400, 'No slots proposed by the other party to confirm');
  const latest = otherProposal.slots[otherProposal.slots.length - 1];
  if (!latest || new Date(latest).getTime() !== scheduled.getTime()) throw new HttpError(400, 'Only the latest proposed time can be confirmed');

  // Enforce event window on confirmation too
  if (event?.startDate && scheduled.getTime() < new Date(event.startDate).getTime()) throw new HttpError(400, 'Scheduled time before event start');
  if (event?.endDate && scheduled.getTime() > new Date(event.endDate).getTime()) throw new HttpError(400, 'Scheduled time after event end');

  pair.scheduledAt = scheduled;
  pair.finalConfirmedTime = scheduled;
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

  // If both reached max attempts and still not scheduled, auto-assign
  try { await checkAndAutoAssign(pair); } catch {}
  
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
  
  if (pair.status === 'scheduled') throw new HttpError(400, 'Pair already scheduled; cannot reject now');
  
  // Move any expired latest proposals to past first to ensure UI reflects past entries
  try { await expireProposalsIfNeeded(pair); } catch {}
  
  // Either party can reject the other party's latest proposed time
  const userRole = await getUserRoleInPair(pair, req.user);
  if (!userRole.isInPair) throw new HttpError(403, 'Not your pair');
  const otherUserId = userRole.isInterviewer ? pair.interviewee?._id : pair.interviewer?._id;
  const otherDoc = await SlotProposal.findOne({ pair: pair._id, user: otherUserId, event: pair.event });
  if (!otherDoc || !otherDoc.slots?.length) {
    // Nothing to reject (likely already expired and moved to past). Return success message for smoother UX.
    return res.json({ message: 'No pending proposal to reject. Any expired times have been moved to Past Time Slots.' });
  }
  const latest = otherDoc.slots.pop();
  otherDoc.pastSlots = otherDoc.pastSlots || [];
  otherDoc.pastSlots.push(latest);
  otherDoc.pastEntries = otherDoc.pastEntries || [];
  otherDoc.pastEntries.push({ time: latest, reason: 'rejected' });
  await otherDoc.save();
  
  const { reason } = req.body || {};
  // Track pair rejection info (throttling removed per new flow)
  pair.rejectionCount = (pair.rejectionCount || 0) + 1;
  pair.lastRejectedAt = new Date();
  pair.rejectionHistory = pair.rejectionHistory || [];
  pair.rejectionHistory.push({ at: new Date(), reason: reason || '' });
  await pair.save();
  
  // In case both have hit their limits, auto-assign
  try {
    const auto = await checkAndAutoAssign(pair);
    if (auto) {
      return res.json({ message: 'Both participants reached proposal limits. A time was auto-assigned.' });
    }
  } catch {}
  
  // Notify the proposer that their slot was rejected
  const notifyEmail = userRole.isInterviewer ? pair.interviewee?.email : pair.interviewer?.email;
  const rejectorName = userRole.isInterviewer ? (pair.interviewer?.name || pair.interviewer?.email) : (pair.interviewee?.name || pair.interviewee?.email);
  if (notifyEmail) {
    try {
      await sendMail({
        to: notifyEmail,
        subject: 'Your Interview Time Was Rejected',
        text: `The previously suggested time (${formatDateTime(latest)}) was rejected. Please propose a new time.${reason ? ` Reason: ${reason}` : ''}`,
      });
    } catch (e) {
      console.error('[rejectSlots] notify email failed:', e.message);
    }
  }
  
  res.json({ message: 'Latest proposal rejected and moved to past' });
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
