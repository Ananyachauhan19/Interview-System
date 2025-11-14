import { sendSlotProposalEmail, sendSlotAcceptanceEmail, sendInterviewScheduledEmail } from '../utils/mailer.js';
import Event from '../models/Event.js';
import Pair from '../models/Pair.js';
import User from '../models/User.js';
import SpecialStudent from '../models/SpecialStudent.js';
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
  
  // Determine model type based on whether event is special
  const modelType = event.isSpecial ? 'SpecialStudent' : 'User';
  
  const created = await Pair.insertMany(
    pairs.map(([a, b]) => ({ 
      event: event._id, 
      interviewer: a, 
      interviewee: b,
      interviewerModel: modelType,
      intervieweeModel: modelType
    }))
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
  
  // If not admin, restrict to pairs where user is interviewer or interviewee
  if (req.user?.role !== 'admin') {
    const userIdToCheck = req.user._id;
    
    // Check for cross-collection IDs based on event type
    let alternateId = null;
    
    if (event.isSpecial && !req.user?.isSpecialStudent && req.user?.email) {
      // Special event + regular User login -> check for SpecialStudent record
      const specialStudent = await SpecialStudent.findOne({
        $or: [
          { email: req.user.email },
          { studentId: req.user.studentId }
        ]
      });
      if (specialStudent) {
        alternateId = specialStudent._id;
        console.log('[listPairs] User also exists as SpecialStudent:', alternateId.toString());
      }
    } else if (!event.isSpecial && req.user?.isSpecialStudent && req.user?.email) {
      // Regular event + SpecialStudent login -> check for User record
      const regularUser = await User.findOne({
        $or: [
          { email: req.user.email },
          { studentId: req.user.studentId }
        ]
      });
      if (regularUser) {
        alternateId = regularUser._id;
        console.log('[listPairs] SpecialStudent also exists as User:', alternateId.toString());
      }
    }
    
    // Build query to check both primary ID and alternate ID (if exists)
    if (alternateId) {
      query = { 
        event: id, 
        $or: [
          { interviewer: userIdToCheck }, 
          { interviewee: userIdToCheck },
          { interviewer: alternateId },
          { interviewee: alternateId }
        ] 
      };
    } else {
      query = { 
        event: id, 
        $or: [
          { interviewer: userIdToCheck }, 
          { interviewee: userIdToCheck }
        ] 
      };
    }
  }

  let pairs;
  try {
    // Get pairs without population first
    pairs = await Pair.find(query).lean();
    
    console.log('[listPairs] Found pairs:', pairs.length, 'for event:', event.name);
    
    // Manually populate based on event type
    if (event.isSpecial) {
      // For special events, populate from SpecialStudent collection
      const studentIds = [...new Set([
        ...pairs.map(p => p.interviewer?.toString()),
        ...pairs.map(p => p.interviewee?.toString())
      ].filter(Boolean))];
      
      // Find SpecialStudents that are enrolled in this specific event
      const students = await SpecialStudent.find({ 
        _id: { $in: studentIds },
        events: event._id // Must be enrolled in this event
      }).lean();
      const studentMap = new Map(students.map(s => [s._id.toString(), s]));
      
      // Attach populated data to pairs
      pairs = pairs.map(p => ({
        ...p,
        interviewer: studentMap.get(p.interviewer?.toString()) || null,
        interviewee: studentMap.get(p.interviewee?.toString()) || null
      }));
    } else {
      // For regular events, populate from User collection
      const userIds = [...new Set([
        ...pairs.map(p => p.interviewer?.toString()),
        ...pairs.map(p => p.interviewee?.toString())
      ].filter(Boolean))];
      
      const users = await User.find({ _id: { $in: userIds } }).lean();
      const userMap = new Map(users.map(u => [u._id.toString(), u]));
      
      // Attach populated data to pairs
      pairs = pairs.map(p => ({
        ...p,
        interviewer: userMap.get(p.interviewer?.toString()) || null,
        interviewee: userMap.get(p.interviewee?.toString()) || null
      }));
    }
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
