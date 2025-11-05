import Event from '../models/Event.js';
import { sendEventNotificationEmail } from '../utils/mailer.js';
import User from '../models/User.js';
import { sendMail } from '../utils/mailer.js';
import { HttpError } from '../utils/errors.js';
import Pair from '../models/Pair.js';
import Feedback from '../models/Feedback.js';
import { supabase } from '../utils/supabase.js';
import { parse } from 'csv-parse/sync';

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

async function uploadTemplate(file) {
  if (!file) return {};
  if (!supabase) throw new HttpError(500, 'Supabase not configured.');
  const bucket = process.env.SUPABASE_BUCKET || 'templates';
  const templateName = file.originalname;
  const key = `${Date.now()}_${templateName}`;
  const contentType = file.mimetype || 'application/octet-stream';
  // multer provides file.buffer (Buffer) - use it directly for Node environment
  const data = file.buffer;
  let upErr;
  try { const up = await supabase.storage.from(bucket).upload(key, data, { contentType, upsert: false }); upErr = up.error || null; } catch (e) { upErr = e; }
  if (upErr) {
  try { await supabase.storage.createBucket(bucket, { public: process.env.SUPABASE_PUBLIC === 'true' }); const retry = await supabase.storage.from(bucket).upload(key, data, { contentType, upsert: false }); if (retry.error) throw retry.error; } catch (e2) { throw new HttpError(500, 'Template upload failed: ' + (upErr?.message || e2?.message || 'unknown')); }
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
  // Validate dates
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;
  const now = Date.now();
  if (start && start.getTime() < now) throw new HttpError(400, 'Start date cannot be in the past');
  if (start && end && end.getTime() < start.getTime()) throw new HttpError(400, 'End date must be the same or after start date');
  const tpl = await uploadTemplate(req.file);
  const event = await Event.create({ name, description, startDate: start || undefined, endDate: end || undefined, ...tpl });
  
  // Send response immediately - emails will be sent asynchronously
  res.status(201).json(event);
  
  // Send emails and generate pairs asynchronously (non-blocking)
  setImmediate(async () => {
    try {
      const students = await User.find({ role: 'student', email: { $exists: true, $ne: null } }, '_id email name');
      const ids = students.map(s => s._id.toString());
      // Always set participants to all students in DB (so analytics show joined count)
      event.participants = students.map(s => s._id);
      await event.save();
      if (ids.length >= 2) {
        // Rotation pairing
        const pairs = ids.map((id, i) => [id, ids[(i + 1) % ids.length]]);
        await Pair.deleteMany({ event: event._id });
        const created = await Pair.insertMany(pairs.map(([a, b]) => ({ event: event._id, interviewer: a, interviewee: b })));
        // Notify students if enabled
        if (process.env.EMAIL_ON_PAIRING === 'true') {
          const byId = new Map(students.map((s) => [s._id.toString(), s]));
          const fe = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
          for (const p of created) {
            const a = byId.get(p.interviewer.toString());
            const b = byId.get(p.interviewee.toString());
            if (a?.email) {
              await sendEventNotificationEmail({
                to: a.email,
                event: { title: event.name, date: formatDateTime(event.startDate), details: event.description },
                interviewer: a.name || a.email,
                interviewee: b.name || b.email,
              });
            }
            if (b?.email) {
              await sendEventNotificationEmail({
                to: b.email,
                event: { title: event.name, date: formatDateTime(event.startDate), details: event.description },
                interviewer: a.name || a.email,
                interviewee: b.name || b.email,
              });
            }
          }
        }
      }
      if (process.env.EMAIL_ON_EVENT === 'true') {
        const fe = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
        const joinUrl = `${fe}/`;
        
        // Send all emails in parallel
        const emailPromises = students.map(s => {
          const lines = [
            `Hello ${s.name || s.email},`,
            `A new event has been created: ${name}.`,
            description ? `Description: ${description}` : null,
            startDate ? `Starts: ${formatDateTime(startDate)}` : null,
            endDate ? `Ends: ${formatDateTime(endDate)}` : null,
            tpl.templateUrl ? `Template: ${tpl.templateUrl}` : null,
            `Join from your dashboard: ${joinUrl}`,
          ].filter(Boolean).join('\n');
          
          return sendMail({ to: s.email, subject: `New Event: ${name}`, text: lines })
            .catch(err => {
              console.error(`[createEvent] Failed to send email to ${s.email}:`, err.message);
              return null;
            });
        });
        
        await Promise.all(emailPromises);
      }
      console.log(`[createEvent] Emails sent successfully for event: ${event._id}`);
    } catch (e) {
      console.error('[createEvent] Async email/pairing failed', e.message);
    }
  });
}

export async function createSpecialEvent(req, res) {
  const { name, description, startDate, endDate } = req.body;
  // Validate dates
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;
  const now = Date.now();
  if (start && start.getTime() < now) throw new HttpError(400, 'Start date cannot be in the past');
  if (start && end && end.getTime() < start.getTime()) throw new HttpError(400, 'End date must be the same or after start date');
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
  const event = await Event.create({ name, description, startDate: start || undefined, endDate: end || undefined, ...tpl, isSpecial: true, allowedParticipants: users.map(u => u._id) });
  
  // Send response immediately - emails will be sent asynchronously
  res.status(201).json({ eventId: event._id, invited: users.length, name: event.name });
  
  // Send emails and generate pairs asynchronously (non-blocking)
  setImmediate(async () => {
    try {
      const ids = users.map(u => u._id.toString());
      // Always set participants to invited users so analytics reflect the invited/joined count
      event.participants = users.map(u => u._id);
      await event.save();
      if (ids.length >= 2) {
        const pairs = ids.map((id, i) => [id, ids[(i + 1) % ids.length]]);
        await Pair.deleteMany({ event: event._id });
        const created = await Pair.insertMany(pairs.map(([a, b]) => ({ event: event._id, interviewer: a, interviewee: b })));
        if (process.env.EMAIL_ON_PAIRING === 'true') {
          const byId = new Map(users.map((s) => [s._id.toString(), s]));
          const fe = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
          
          // Collect all email tasks
          const emailPromises = [];
          
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
              
              emailPromises.push(
                sendMail({ to: a.email, subject: `Pairing info: You interview ${b?.name || b?.email || 'a peer'}`, text })
                  .catch(err => {
                    console.error(`[createSpecialEvent] Failed to send email to ${a.email}:`, err.message);
                    return null;
                  })
              );
            }
            
            if (b?.email) {
              const text = [
                `Hi ${b.name || b.email},`,
                `You will be interviewed by: ${a?.name || a?.email}.`,
                a?.email ? `Their email: ${a.email}` : null,
                `Review and accept slots from your dashboard: ${fe}/`,
              ].filter(Boolean).join('\n');
              
              emailPromises.push(
                sendMail({ to: b.email, subject: `Pairing info: You are interviewed by ${a?.name || a?.email || 'a peer'}`, text })
                  .catch(err => {
                    console.error(`[createSpecialEvent] Failed to send email to ${b.email}:`, err.message);
                    return null;
                  })
              );
            }
          }
          
          // Send all pairing emails in parallel
          await Promise.all(emailPromises);
        }
      }
      if (process.env.EMAIL_ON_EVENT === 'true') {
        const fe = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
        
        // Send all special event emails in parallel
        const emailPromises = users
          .filter(u => u.email)
          .map(u => {
            const lines = [
              `Hello ${u.name || u.email},`,
              `You are invited to a special event: ${name}.`,
              description ? `Description: ${description}` : null,
              startDate ? `Starts: ${formatDateTime(startDate)}` : null,
              endDate ? `Ends: ${formatDateTime(endDate)}` : null,
              tpl.templateUrl ? `Template: ${tpl.templateUrl}` : null,
              `Access it from your dashboard: ${fe}/`,
            ].filter(Boolean).join('\n');
            
            return sendMail({ to: u.email, subject: `Special Event: ${name}`, text: lines })
              .catch(err => {
                console.error(`[createSpecialEvent] Failed to send email to ${u.email}:`, err.message);
                return null;
              });
          });
        
        await Promise.all(emailPromises);
      }
      console.log(`[createSpecialEvent] Emails sent successfully for event: ${event._id}`);
    } catch (e) {
      console.error('[createSpecialEvent] Async email/pairing failed', e.message);
    }
  });
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
  // capacity removed - no limit enforced
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
  const isAdmin = req.user?.role === 'admin';
  if (!event.templateKey) return res.json(isAdmin ? { templateUrl: event.templateUrl || null, templateKey: event.templateKey } : { templateUrl: event.templateUrl || null });
  if (process.env.SUPABASE_PUBLIC === 'true') return res.json(isAdmin ? { templateUrl: event.templateUrl, templateKey: event.templateKey } : { templateUrl: event.templateUrl });
  if (!supabase) throw new HttpError(500, 'Supabase not configured');
  const ttl = Number(process.env.SUPABASE_SIGNED_TTL || 600);
  // Try a set of likely buckets in case configuration changed after upload
  const configured = process.env.SUPABASE_BUCKET || 'templates';
  const tryBuckets = Array.from(new Set([configured, 'templates', 'patient-records']));
  for (const bucket of tryBuckets) {
    try {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(event.templateKey, ttl);
      if (!error && data?.signedUrl) {
        return res.json(isAdmin ? { templateUrl: data.signedUrl, templateKey: event.templateKey, bucket } : { templateUrl: data.signedUrl });
      }
      // if error indicates object not found, continue to try next bucket
      if (error && /not found|Object not found|404/i.test(error.message || '')) {
        continue;
      }
      if (error) {
        // other errors are surfaced
        throw error;
      }
    } catch (e) {
      // If supabase client throws, try next bucket unless it's a critical error
      if (e && /not found|Object not found|404/i.test(e.message || '')) {
        continue;
      }
      throw new HttpError(500, `Failed to create signed URL: ${e?.message || String(e)}`);
    }
  }
  // If we reached here, object wasn't found in any bucket
  throw new HttpError(404, `Template object not found in configured buckets (${tryBuckets.join(', ')}).`);
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
