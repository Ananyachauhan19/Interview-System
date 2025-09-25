import Event from '../models/Event.js';
import User from '../models/User.js';
import { sendMail, renderTemplate } from '../utils/mailer.js';
import { HttpError } from '../utils/errors.js';
import Pair from '../models/Pair.js';
import Feedback from '../models/Feedback.js';
import { supabase } from '../utils/supabase.js';

export async function createEvent(req, res) {
  const { name, description, startDate, endDate } = req.body;
  let templateUrl, templateName, templateKey;
  if (req.file) {
    if (!supabase) throw new HttpError(500, 'Supabase not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY (or SUPABASE_KEY).');
    templateName = req.file.originalname;
    const bucket = process.env.SUPABASE_BUCKET || 'templates';
    const key = `${Date.now()}_${templateName}`;
  // Create a Blob for supabase-js upload (works well in Node >=18)
  const buf = req.file.buffer;
  const contentType = req.file.mimetype || 'application/octet-stream';
  const blob = new Blob([buf], { type: contentType });
    let upErr;
    try {
  const up = await supabase.storage.from(bucket).upload(key, blob, { contentType, upsert: false });
      upErr = up.error || null;
    } catch (e) {
      upErr = e;
    }
    if (upErr) {
      console.error('Supabase upload error (createEvent):', upErr?.stack || upErr?.message || upErr);
      // Try to create the bucket (requires service role key) then retry once
      try {
        await supabase.storage.createBucket(bucket, { public: process.env.SUPABASE_PUBLIC === 'true' });
        const retry = await supabase.storage.from(bucket).upload(key, blob, { contentType, upsert: false });
        if (retry.error) throw retry.error;
      } catch (e2) {
        console.error('Supabase retry upload error (createEvent):', e2?.stack || e2?.message || e2);
        const reason = upErr?.message || String(upErr) || e2?.message || String(e2) || 'unknown';
        throw new HttpError(500, `Template upload failed: ${reason}`);
      }
    }
    if (process.env.SUPABASE_PUBLIC === 'true') {
      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(key);
      templateUrl = pub.publicUrl;
    } else {
      const ttl = Number(process.env.SUPABASE_SIGNED_TTL || 600);
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(key, ttl);
      if (error) throw new HttpError(500, `Failed to create signed URL: ${error.message}`);
      templateUrl = data.signedUrl;
    }
    templateKey = key;
  }
  const event = await Event.create({ name, description, startDate, endDate, templateUrl, templateName, templateKey });
  // notify all students
  if (process.env.EMAIL_ON_EVENT === 'true') {
    const students = await User.find({ role: 'student', email: { $exists: true, $ne: null } }, 'email name');
    for (const s of students) {
      await sendMail({
        to: s.email,
        subject: `New Event: ${name}`,
        text: renderTemplate('Hello {studentName}, new event {eventName} created.', { studentName: s.name || s.email, eventName: name }),
      });
    }
  }
  res.status(201).json(event);
}

export async function listEvents(req, res) {
  // Include whether current user has joined
  const userId = req.user?._id;
  const events = await Event.find().sort({ createdAt: -1 }).lean();
  const map = events.map((e) => ({ ...e, joined: userId ? (e.participants?.some?.((p) => p.toString() === userId.toString()) || false) : false }));
  res.json(map);
}

export async function joinEvent(req, res) {
  const eventId = req.params.id;
  const userId = req.user._id;
  const event = await Event.findById(eventId);
  if (!event) throw new HttpError(404, 'Event not found');
  if (event.participants.some((p) => p.equals(userId))) return res.json({ message: 'Already joined' });
  event.participants.push(userId);
  await event.save();
  res.json({ message: 'Joined', eventId });
}

export async function exportJoinedCsv(req, res) {
  const event = await Event.findById(req.params.id).populate('participants');
  if (!event) throw new HttpError(404, 'Event not found');
  const header = 'name,email,studentId,course,branch,college\n';
  const rows = event.participants.map((s) => [s.name, s.email, s.studentId, s.course, s.branch, s.college].join(','));
  const csv = header + rows.join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="event_${event._id}_participants.csv"`);
  res.send(csv);
}

export async function eventAnalytics(req, res) {
  const eventId = req.params.id;
  const event = await Event.findById(eventId);
  if (!event) throw new HttpError(404, 'Event not found');
  const joined = event.participants.length;
  const pairs = await Pair.find({ event: eventId });
  const scheduled = pairs.filter((p) => p.scheduledAt).length;
  const fb = await Feedback.find({ event: eventId });
  const submitted = fb.length; // each doc is one feedback submission
  const avg = fb.length ? (fb.reduce((a, b) => a + (b.marks || 0), 0) / fb.length) : 0;
  res.json({ joined, pairs: pairs.length, scheduled, feedbackSubmissions: submitted, averageScore: Number(avg.toFixed(2)) });
}

export async function replaceEventTemplate(req, res) {
  const eventId = req.params.id;
  if (!req.file) throw new HttpError(400, 'Template file required');
  if (!supabase) throw new HttpError(500, 'Supabase not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY (or SUPABASE_KEY).');
  const event = await Event.findById(eventId);
  if (!event) throw new HttpError(404, 'Event not found');

  const bucket = process.env.SUPABASE_BUCKET || 'templates';
  const templateName = req.file.originalname;
  const key = `${Date.now()}_${templateName}`;
  const rbuf = req.file.buffer;
  const rContentType = req.file.mimetype || 'application/octet-stream';
  const rBlob = new Blob([rbuf], { type: rContentType });
  let upErr;
  try {
  const up = await supabase.storage.from(bucket).upload(key, rBlob, { contentType: rContentType, upsert: false });
    upErr = up.error || null;
  } catch (e) { upErr = e; }
  if (upErr) {
    console.error('Supabase upload error (replaceEventTemplate):', upErr?.stack || upErr?.message || upErr);
    try {
      await supabase.storage.createBucket(bucket, { public: process.env.SUPABASE_PUBLIC === 'true' });
      const retry = await supabase.storage.from(bucket).upload(key, rBlob, { contentType: rContentType, upsert: false });
      if (retry.error) throw retry.error;
    } catch (e2) {
      console.error('Supabase retry upload error (replaceEventTemplate):', e2?.stack || e2?.message || e2);
      const reason = upErr?.message || String(upErr) || e2?.message || String(e2) || 'unknown';
      throw new HttpError(500, `Template upload failed: ${reason}`);
    }
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

  event.templateUrl = templateUrl;
  event.templateName = templateName;
  event.templateKey = key;
  await event.save();

  res.json(event);
}

export async function getTemplateUrl(req, res) {
  const eventId = req.params.id;
  const event = await Event.findById(eventId).lean();
  if (!event) throw new HttpError(404, 'Event not found');
  if (!event.templateKey) return res.json({ templateUrl: event.templateUrl || null });
  if (process.env.SUPABASE_PUBLIC === 'true') return res.json({ templateUrl: event.templateUrl });
  if (!supabase) throw new HttpError(500, 'Supabase not configured');
  const bucket = process.env.SUPABASE_BUCKET || 'templates';
  const ttl = Number(process.env.SUPABASE_SIGNED_TTL || 600);
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(event.templateKey, ttl);
  if (error) throw new HttpError(500, `Failed to create signed URL: ${error.message}`);
  return res.json({ templateUrl: data.signedUrl });
}
