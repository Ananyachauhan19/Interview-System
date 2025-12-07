import Feedback from '../models/Feedback.js';
import Pair from '../models/Pair.js';
import Event from '../models/Event.js';
import User from '../models/User.js';
import { HttpError } from '../utils/errors.js';

// Only interviewer can submit feedback about the interviewee.
// Feedback allowed only after the meeting END (scheduledAt + duration) OR after event end.
export async function submitFeedback(req, res) {
  const { pairId, marks, comments, ratings, suggestions } = req.body;
  
  // Support both old format (marks) and new format (ratings)
  let finalMarks = marks;
  let feedbackData = { marks: finalMarks, comments };
  
  if (ratings) {
    // New format with detailed ratings
    const { integrity, communication, preparedness, problemSolving, attitude } = ratings;
    if (!integrity || !communication || !preparedness || !problemSolving || !attitude) {
      throw new HttpError(400, 'All rating criteria required');
    }
    const totalMarks = integrity + communication + preparedness + problemSolving + attitude;
    finalMarks = (totalMarks / 25) * 100; // Convert 25-point scale to 100-point scale
    feedbackData = {
      marks: finalMarks,
      comments: suggestions || comments,
      integrity,
      communication,
      preparedness,
      problemSolving,
      attitude,
      totalMarks,
      suggestions
    };
  } else if (marks == null || isNaN(marks)) {
    throw new HttpError(400, 'Marks required');
  }
  
  const pair = await Pair.findById(pairId);
  if (!pair) throw new HttpError(404, 'Pair not found');
  // Enforce interviewer role
  if (!pair.interviewer.equals(req.user._id)) {
    throw new HttpError(403, 'Only the interviewer can submit feedback');
  }
  const event = await Event.findById(pair.event);
  if (!event) throw new HttpError(404, 'Event not found');
  const now = Date.now();
  const scheduledStart = pair.scheduledAt ? new Date(pair.scheduledAt).getTime() : null;
  const durationMin = Number(process.env.MEETING_DURATION_MIN || 30);
  const scheduledEnd = scheduledStart ? (scheduledStart + durationMin * 60 * 1000) : null;
  const eventEnd = event.endDate ? new Date(event.endDate).getTime() : null;
  if (!((scheduledEnd && now >= scheduledEnd) || (eventEnd && now >= eventEnd))) {
    throw new HttpError(400, `Feedback opens after session ends${scheduledEnd ? ' at ' + new Date(scheduledEnd).toLocaleString() : ''}`);
  }
  const to = pair.interviewee; // receiver always interviewee
  // Block duplicate submissions
  const existing = await Feedback.findOne({ event: pair.event, pair: pair._id, from: req.user._id, to });
  if (existing) throw new HttpError(400, 'Feedback already submitted for this session');
  const fb = await Feedback.findOneAndUpdate(
    { event: pair.event, pair: pair._id, from: req.user._id, to },
    feedbackData,
    { upsert: true, new: true }
  );
  
  // Mark pair as completed after feedback submission
  await Pair.findByIdAndUpdate(pairId, { status: 'completed' });
  
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

// Auth user: feedback about them (they are the interviewee / receiver)
export async function listFeedbackForMe(req, res) {
  const { eventId } = req.query;
  const filter = { to: req.user._id };
  if (eventId) filter.event = eventId;
  const list = await Feedback.find(filter).populate('from pair event').lean();
  res.json(list.map(f => ({
    pair: f.pair?._id || f.pair,
    event: {
      _id: f.event?._id,
      name: f.event?.name,
      title: f.event?.title,
      dateTime: f.event?.dateTime,
      startDate: f.event?.startDate,
      endDate: f.event?.endDate,
    },
    from: f.from?.name || f.from?.email,
    fromEmail: f.from?.email,
    marks: f.marks,
    comments: f.comments,
    // Include detailed ratings
    integrity: f.integrity,
    communication: f.communication,
    preparedness: f.preparedness,
    problemSolving: f.problemSolving,
    attitude: f.attitude,
    totalMarks: f.totalMarks,
    suggestions: f.suggestions,
    submittedAt: f.createdAt,
  })));
}

// Coordinator: list feedback for assigned students only
export async function listCoordinatorFeedback(req, res) {
  const { college, eventId } = req.query;
  
  // Get students assigned to this coordinator
  const assignedStudents = await User.find({ 
    teacherId: req.user.coordinatorId,
    role: 'student' 
  }, '_id');
  
  const studentIds = assignedStudents.map(s => s._id);
  
  const filter = { to: { $in: studentIds } };
  if (eventId) filter.event = eventId;
  if (college) {
    const users = await User.find({ 
      college: new RegExp(`^${college}$`, 'i'),
      _id: { $in: studentIds }
    }, '_id');
    const ids = users.map(u => u._id);
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

// Coordinator: export filtered feedback for assigned students
export async function exportCoordinatorFeedback(req, res) {
  const { college, eventId } = req.query;
  
  // Get students assigned to this coordinator
  const assignedStudents = await User.find({ 
    teacherId: req.user.coordinatorId,
    role: 'student' 
  }, '_id');
  
  const studentIds = assignedStudents.map(s => s._id);
  
  const filter = { to: { $in: studentIds } };
  if (eventId) filter.event = eventId;
  if (college) {
    const users = await User.find({ 
      college: new RegExp(`^${college}$`, 'i'),
      _id: { $in: studentIds }
    }, '_id');
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
  res.setHeader('Content-Disposition', 'attachment; filename="coordinator_feedback_filtered.csv"');
  res.send(csv);
}
