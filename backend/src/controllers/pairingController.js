import { sendSlotProposalEmail, sendSlotAcceptanceEmail, sendInterviewScheduledEmail } from '../utils/mailer.js';
import Event from '../models/Event.js';
import Pair from '../models/Pair.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import { sendMail, renderTemplate } from '../utils/mailer.js';
import { HttpError } from '../utils/errors.js';

// Fisher-Yates shuffle algorithm for random array shuffling
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

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

// meeting link is already hidden until 1 hour prior in listPairs

async function generateRotationPairsForEvent(event) {
  const participants = event.participants || [];
  const ids = participants.map((s) => (s._id ? s._id.toString() : String(s)));
  if (ids.length < 2) return [];
  
  // Shuffle IDs to create randomized pairings for each event
  const shuffledIds = shuffleArray(ids);
  const pairs = shuffledIds.map((id, i) => [id, shuffledIds[(i + 1) % shuffledIds.length]]);
  await Pair.deleteMany({ event: event._id });
  
  // All pairs now reference the User model; special status is stored on User
  const modelType = 'User';
  
  // Generate default time slots - evenly distributed between event start and end
  const eventStart = event.startDate ? new Date(event.startDate).getTime() : Date.now();
  const eventEnd = event.endDate ? new Date(event.endDate).getTime() : eventStart + (7 * 24 * 60 * 60 * 1000); // 7 days if no end
  const totalPairs = pairs.length;
  const timeGap = totalPairs > 1 ? (eventEnd - eventStart) / totalPairs : 0;
  
  const created = await Pair.insertMany(
    pairs.map(([a, b], index) => {
      // Calculate default time slot for this pair
      const defaultTime = new Date(eventStart + (timeGap * index));
      // Round to nearest 30 minutes
      const minutes = defaultTime.getMinutes();
      const roundedMinutes = Math.round(minutes / 30) * 30;
      defaultTime.setMinutes(roundedMinutes, 0, 0);
      
      return { 
        event: event._id, 
        interviewer: a, 
        interviewee: b,
        interviewerModel: modelType,
        intervieweeModel: modelType,
        defaultTimeSlot: defaultTime,
        currentProposedTime: defaultTime
      };
    })
  );

  // Pairing emails removed - only send when slots are proposed
  console.log(`[generateRotationPairs] Created ${created.length} randomized pairs for event ${event._id} with model type: ${modelType}`);

  return created;
}

export async function listPairs(req, res) {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new HttpError(400, 'Invalid event id');
  }

  // Check if event exists and if it's a special event
  const event = await Event.findById(id).lean();
  if (!event) throw new HttpError(404, 'Event not found');

  let query = { event: id };

  // Admins see all pairs; Coordinators should see all pairs for their events
  if (req.user?.role === 'coordinator') {
    // Coordinators can view all pairs for events they own; event ownership validated in getEvent route
    query = { event: id };
  } else if (req.user?.role !== 'admin') {
    const userIdToCheck = req.user._id;
    // Students see only pairs where they are interviewer or interviewee (single User model)
    query = { 
      event: id, 
      $or: [
        { interviewer: userIdToCheck }, 
        { interviewee: userIdToCheck }
      ] 
    };
  }

  let pairs;
  try {
    // Get pairs without population first
    pairs = await Pair.find(query).lean();
    
    console.log('[listPairs] Found pairs:', pairs.length, 'for event:', event.name);
    
    // Populate from User collection for all events
    const userIds = [...new Set([
      ...pairs.map(p => p.interviewer?.toString()),
      ...pairs.map(p => p.interviewee?.toString())
    ].filter(Boolean))];

    const users = await User.find({ _id: { $in: userIds } }).lean();
    const userMap = new Map(users.map(u => [u._id.toString(), u]));

    pairs = pairs.map(p => ({
      ...p,
      interviewer: userMap.get(p.interviewer?.toString()) || null,
      interviewee: userMap.get(p.interviewee?.toString()) || null
    }));
  } catch (e) {
    // Add lightweight diagnostics (safe) to help track unexpected failures
    console.error('[listPairs] query failed', { eventId: id, user: req.user?._id?.toString(), error: e.message });
    throw e; // propagate to error handler
  }

  // Add default time slots to pairs that don't have them
  const eventStart = event.startDate ? new Date(event.startDate).getTime() : Date.now();
  const eventEnd = event.endDate ? new Date(event.endDate).getTime() : eventStart + (7 * 24 * 60 * 60 * 1000);
  const totalPairs = pairs.length;
  const timeGap = totalPairs > 1 ? (eventEnd - eventStart) / totalPairs : 0;
  
  const now = Date.now();
  
  for (let i = 0; i < pairs.length; i++) {
    if (!pairs[i].defaultTimeSlot) {
      // Generate default time slot
      const defaultTime = new Date(eventStart + (timeGap * i));
      const minutes = defaultTime.getMinutes();
      const roundedMinutes = Math.round(minutes / 30) * 30;
      defaultTime.setMinutes(roundedMinutes, 0, 0);
      
      // Update in database
      await Pair.findByIdAndUpdate(pairs[i]._id, { defaultTimeSlot: defaultTime, currentProposedTime: defaultTime });
      pairs[i].defaultTimeSlot = defaultTime;
      pairs[i].currentProposedTime = defaultTime;
      console.log(`[listPairs] Added default time slot to pair ${pairs[i]._id}: ${defaultTime.toLocaleString()}`);
    }
    // Ensure currentProposedTime is initialized if missing
    if (pairs[i].defaultTimeSlot && !pairs[i].currentProposedTime) {
      await Pair.findByIdAndUpdate(pairs[i]._id, { currentProposedTime: pairs[i].defaultTimeSlot });
      pairs[i].currentProposedTime = pairs[i].defaultTimeSlot;
    }
    
    // Check if default time slot has expired (is in the past)
    if (pairs[i].defaultTimeSlot) {
      const defaultTimeMs = new Date(pairs[i].defaultTimeSlot).getTime();
      pairs[i].defaultTimeExpired = defaultTimeMs <= now;
    }
  }

  const oneHourMs = 60 * 60 * 1000;
  const sanitized = pairs.map((p) => ({ ...p, status: p.status || 'pending' }));
  
  // Log first pair to verify defaultTimeSlot is included
  if (sanitized.length > 0) {
    console.log('[listPairs] Sample pair response:', {
      id: sanitized[0]._id,
      hasDefaultTimeSlot: !!sanitized[0].defaultTimeSlot,
      defaultTimeSlot: sanitized[0].defaultTimeSlot,
      defaultTimeExpired: sanitized[0].defaultTimeExpired,
      status: sanitized[0].status
    });
  }
  
  res.json(sanitized);
}

export async function getPairDetails(req, res) {
  const { pairId } = req.params;
  console.log('[getPairDetails] Request for pairId:', pairId);
  
  if (!mongoose.Types.ObjectId.isValid(pairId)) {
    console.log('[getPairDetails] Invalid pair id format');
    throw new HttpError(400, 'Invalid pair id');
  }

  const pair = await Pair.findById(pairId).lean();
  if (!pair) {
    console.log('[getPairDetails] Pair not found');
    throw new HttpError(404, 'Pair not found');
  }
  console.log('[getPairDetails] Pair found:', pair._id);

  // Fetch event
  const event = await Event.findById(pair.event).lean();
  if (!event) {
    console.log('[getPairDetails] Event not found');
    throw new HttpError(404, 'Event not found');
  }
  console.log('[getPairDetails] Event found:', event.name);

  // Populate interviewer and interviewee from User model for all events
  console.log('[getPairDetails] Loading User data');
  const interviewer = await User.findById(pair.interviewer).lean();
  const interviewee = await User.findById(pair.interviewee).lean();

  console.log('[getPairDetails] Returning pair details with event and participants');
  return res.json({
    ...pair,
    event,
    interviewer,
    interviewee
  });
}

export async function setMeetingLink(req, res) {
  // Admin sets or updates meeting link; only allowed within 1 hour before start
  if (req.user?.role !== 'admin') throw new HttpError(403, 'Admin only');
  const { pairId } = req.params;
  const { meetingLink } = req.body;
  const pair = await Pair.findById(pairId)
    .populate('interviewer')
    .populate('interviewee');
  if (!pair) throw new HttpError(404, 'Pair not found');
  if (!pair.scheduledAt) throw new HttpError(400, 'Pair not scheduled yet');
  const now = Date.now();
  const showAt = new Date(pair.scheduledAt).getTime() - 60 * 60 * 1000;
  if (now < showAt) throw new HttpError(400, 'Cannot set meeting link earlier than 1 hour before scheduled time');
  pair.meetingLink = meetingLink;
  await pair.save();
  // Email both parties with generated link
  const subject = 'Meeting link available';
  const text = `Your interview at ${formatDateTime(pair.scheduledAt)} now has a meeting link: ${meetingLink}`;
  for (const to of [pair.interviewer?.email, pair.interviewee?.email].filter(Boolean)) {
    await sendInterviewScheduledEmail({
      to,
      interviewer: pair.interviewer?.name || pair.interviewer?.email,
      interviewee: pair.interviewee?.name || pair.interviewee?.email,
      event: { title: 'Interview', date: formatDateTime(pair.scheduledAt), details: 'Interview scheduled' },
      link: meetingLink,
    });
  }
  res.json({ message: 'Link set', pairId: pair._id });
}
