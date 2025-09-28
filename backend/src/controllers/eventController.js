// PATCH /events/:id/join-disable
export async function updateEventJoinDisable(req, res) {
  const event = await Event.findById(req.params.id);
  if (!event) throw new HttpError(404, 'Event not found');
  const { joinDisabled, joinDisableTime } = req.body;
  // Manual disable overrides scheduled disable
  if (typeof joinDisabled !== 'undefined') {
    event.joinDisabled = !!joinDisabled;
    if (joinDisabled) {
      event.joinDisableTime = null; // clear scheduled if manually disabled
    }
  }
  if (typeof joinDisableTime !== 'undefined' && !event.joinDisabled) {
    event.joinDisableTime = joinDisableTime ? new Date(joinDisableTime) : null;
  }
  await event.save();
  res.json(event);
}
export async function updateEventCapacity(req, res) {
  console.log('PATCH /events/:id/capacity', req.params.id, req.body);
  const event = await Event.findById(req.params.id);
  if (!event) throw new HttpError(404, 'Event not found');
  let { capacity } = req.body;
  if (capacity === null || capacity === '' || typeof capacity === 'undefined') {
    event.capacity = null;
  } else {
    if (isNaN(Number(capacity)) || Number(capacity) < 1) throw new HttpError(400, 'Invalid capacity');
    event.capacity = Number(capacity);
  }
  await event.save();
  res.json(event);
}
import Event from '../models/Event.js';
import User from '../models/User.js';
import { sendMail } from '../utils/mailer.js';
import { HttpError } from '../utils/errors.js';
import Pair from '../models/Pair.js';
import Feedback from '../models/Feedback.js';
import { supabase } from '../utils/supabase.js';
import { parse } from 'csv-parse/sync';

async function uploadTemplate(file) {
  if (!file) return {};
  if (!supabase) throw new HttpError(500, 'Supabase not configured.');
  const bucket = process.env.SUPABASE_BUCKET || 'templates';
  const templateName = file.originalname;
  const key = `${Date.now()}_${templateName}`;
  const contentType = file.mimetype || 'application/octet-stream';
  const blob = new Blob([file.buffer], { type: contentType });
  let upErr;
  try { const up = await supabase.storage.from(bucket).upload(key, blob, { contentType, upsert: false }); upErr = up.error || null; } catch (e) { upErr = e; }
  if (upErr) {
    try { await supabase.storage.createBucket(bucket, { public: process.env.SUPABASE_PUBLIC === 'true' }); const retry = await supabase.storage.from(bucket).upload(key, blob, { contentType, upsert: false }); if (retry.error) throw retry.error; } catch (e2) { throw new HttpError(500, 'Template upload failed: ' + (upErr?.message || e2?.message || 'unknown')); }
  }
  let templateUrl;
  if (process.env.SUPABASE_PUBLIC === 'true') {
    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(key);
    templateUrl = pub.publicUrl;
  } else {
    const ttl = Number(process.env.SUPABASE_SIGNED_TTL || 600);
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(key, ttl);
    if (error) throw new HttpError(500, `Failed to create signed URL: ${error.message}`);
    templateUrl = data.signedUrl;
  }
  return { templateUrl, templateName, templateKey: key };
}

export async function createEvent(req, res) {
  const { name, description, startDate, endDate } = req.body;
  const tpl = await uploadTemplate(req.file);
  const event = await Event.create({ name, description, startDate, endDate, ...tpl });
  if (process.env.EMAIL_ON_EVENT === 'true') {
    const students = await User.find({ role: 'student', email: { $exists: true, $ne: null } }, 'email name');
    const fe = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
    const joinUrl = `${fe}/`;
    for (const s of students) {
      const lines = [
        `Hello ${s.name || s.email},`,
        `A new event has been created: ${name}.`,
        description ? `Description: ${description}` : null,
        startDate ? `Starts: ${new Date(startDate).toLocaleString()}` : null,
        endDate ? `Ends: ${new Date(endDate).toLocaleString()}` : null,
        tpl.templateUrl ? `Template: ${tpl.templateUrl}` : null,
        `Join from your dashboard: ${joinUrl}`,
      ].filter(Boolean).join('\n');
      await sendMail({ to: s.email, subject: `New Event: ${name}`, text: lines });
    }
  }
  res.status(201).json(event);
}

export async function createSpecialEvent(req, res) {
  const { name, description, startDate, endDate } = req.body;
  if (!req.files?.csv?.[0]) throw new HttpError(400, 'CSV file required');
  let rows;
  try { rows = parse(req.files.csv[0].buffer.toString('utf8'), { columns: true, skip_empty_lines: true }); }
  catch (e) { throw new HttpError(400, 'Invalid CSV: ' + (e.message || e)); }
  const identifiers = [];
  for (const r of rows) {
    const email = r.email || r.Email || r.EMAIL;
    const sid = r.studentId || r.StudentId || r.STUDENTID || r.studentID;
    if (email) identifiers.push({ type: 'email', value: String(email).trim() });
    else if (sid) identifiers.push({ type: 'studentId', value: String(sid).trim() });
  }
  if (!identifiers.length) throw new HttpError(400, 'No valid identifiers');
  const seen = new Set();
  const dedup = identifiers.filter(i => { const k = i.type + ':' + i.value.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
  const or = dedup.map(i => i.type === 'email' ? { email: i.value } : { studentId: i.value });
  const users = await User.find({ $or: or }, '_id email name studentId');
  const tpl = await uploadTemplate(req.files?.template?.[0]);
  const event = await Event.create({ name, description, startDate, endDate, ...tpl, isSpecial: true, allowedParticipants: users.map(u => u._id) });
  if (process.env.EMAIL_ON_EVENT === 'true') {
    const fe = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
    for (const u of users) {
      if (!u.email) continue;
      const lines = [
        `Hello ${u.name || u.email},`,
        `You are invited to a special event: ${name}.`,
        description ? `Description: ${description}` : null,
        startDate ? `Starts: ${new Date(startDate).toLocaleString()}` : null,
        endDate ? `Ends: ${new Date(endDate).toLocaleString()}` : null,
        tpl.templateUrl ? `Template: ${tpl.templateUrl}` : null,
        `Access it from your dashboard: ${fe}/`,
      ].filter(Boolean).join('\n');
      await sendMail({ to: u.email, subject: `Special Event: ${name}`, text: lines });
    }
  }
  res.status(201).json({ eventId: event._id, invited: users.length });
}

export async function getEvent(req, res) {
  const eventId = req.params.id;
  const event = await Event.findById(eventId).populate('participants', 'name email').lean();
  if (!event) throw new HttpError(404, 'Event not found');
  const now = new Date();
  const ended = event.endDate ? (now > new Date(event.endDate)) : false;
  const canDeleteTemplate = ended && !!event.templateKey;
  res.json({ ...event, ended, canDeleteTemplate, participantCount: event.participants?.length || 0 });
}

export async function listEvents(req, res) {
  const userId = req.user?._id;
  const isAdmin = req.user?.role === 'admin';
  const events = await Event.find().sort({ createdAt: -1 }).lean();
  const visible = events.filter(e => {
    if (!e.isSpecial) return true;
    if (isAdmin) return true;
    if (!userId) return false;
    return e.allowedParticipants?.some?.(p => p.toString() === userId.toString());
  });
  const mapped = visible.map(e => ({ ...e, joined: userId ? (e.participants?.some?.(p => p.toString() === userId.toString()) || false) : false }));
  res.json(mapped);
}

export async function joinEvent(req, res) {
  const event = await Event.findById(req.params.id);
  if (!event) throw new HttpError(404, 'Event not found');
  const userId = req.user._id;
  if (event.isSpecial && !event.allowedParticipants?.some?.(p => p.equals(userId))) throw new HttpError(403, 'Not allowed for this special event');
  if (event.participants.some(p => p.equals(userId))) return res.json({ message: 'Already joined' });
  // Capacity check
  if (event.capacity !== null && event.capacity !== '' && event.participants.length >= event.capacity) {
    throw new HttpError(400, 'Event capacity reached');
  }
  event.participants.push(userId);
  await event.save();
  res.json({ message: 'Joined', eventId: event._id });
}

export async function exportJoinedCsv(req, res) {
  const event = await Event.findById(req.params.id).populate('participants');
  if (!event) throw new HttpError(404, 'Event not found');
  const header = 'name,email,studentId,course,branch,college\n';
  const rows = event.participants.map(s => [s.name, s.email, s.studentId, s.course, s.branch, s.college].join(','));
  const csv = header + rows.join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="event_${event._id}_participants.csv"`);
  res.send(csv);
}

export async function eventAnalytics(req, res) {
  const event = await Event.findById(req.params.id);
  if (!event) throw new HttpError(404, 'Event not found');
  const pairs = await Pair.find({ event: event._id });
  const fb = await Feedback.find({ event: event._id });
  const joined = event.participants.length;
  const scheduled = pairs.filter(p => p.scheduledAt).length;
  const submitted = fb.length;
  const avg = fb.length ? (fb.reduce((a, b) => a + (b.marks || 0), 0) / fb.length) : 0;
  res.json({ joined, pairs: pairs.length, scheduled, feedbackSubmissions: submitted, averageScore: Number(avg.toFixed(2)) });
}

export async function replaceEventTemplate(req, res) {
  if (!req.file) throw new HttpError(400, 'Template file required');
  const event = await Event.findById(req.params.id);
  if (!event) throw new HttpError(404, 'Event not found');
  const tpl = await uploadTemplate(req.file);
  Object.assign(event, tpl);
  await event.save();
  res.json(event);
}

export async function getTemplateUrl(req, res) {
  const event = await Event.findById(req.params.id).lean();
  if (!event) throw new HttpError(404, 'Event not found');
  if (!event.templateKey) return res.json({ templateUrl: event.templateUrl || null });
  if (process.env.SUPABASE_PUBLIC === 'true') return res.json({ templateUrl: event.templateUrl });
  if (!supabase) throw new HttpError(500, 'Supabase not configured');
  const bucket = process.env.SUPABASE_BUCKET || 'templates';
  const ttl = Number(process.env.SUPABASE_SIGNED_TTL || 600);
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(event.templateKey, ttl);
  if (error) throw new HttpError(500, `Failed to create signed URL: ${error.message}`);
  res.json({ templateUrl: data.signedUrl });
}

export async function deleteEventTemplate(req, res) {
  const event = await Event.findById(req.params.id);
  if (!event) throw new HttpError(404, 'Event not found');
  if (!event.templateKey) return res.json({ message: 'No template to delete' });
  if (!event.endDate || new Date() < new Date(event.endDate)) throw new HttpError(400, 'Event has not ended yet');
  if (!supabase) throw new HttpError(500, 'Supabase not configured');
  const bucket = process.env.SUPABASE_BUCKET || 'templates';
  await supabase.storage.from(bucket).remove([event.templateKey]);
  event.templateKey = undefined; event.templateUrl = undefined; event.templateName = undefined;
  await event.save();
  res.json({ message: 'Template deleted' });
}
