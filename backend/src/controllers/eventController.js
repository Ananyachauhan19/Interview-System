import Event from '../models/Event.js';
import { sendEventNotificationEmail } from '../utils/mailer.js';
import User from '../models/User.js';
import { sendMail, sendOnboardingEmail } from '../utils/mailer.js';
import { HttpError } from '../utils/errors.js';
import Pair from '../models/Pair.js';
import Feedback from '../models/Feedback.js';
import { supabase } from '../utils/supabase.js';
import { parse } from 'csv-parse/sync';
import SpecialStudent from '../models/SpecialStudent.js';

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
      
      // Generate pairs but don't send pairing emails
      if (ids.length >= 2) {
        const pairs = ids.map((id, i) => [id, ids[(i + 1) % ids.length]]);
        await Pair.deleteMany({ event: event._id });
        await Pair.insertMany(pairs.map(([a, b]) => ({ event: event._id, interviewer: a, interviewee: b })));
        console.log(`[createEvent] Created ${pairs.length} pairs`);
      }
      
      // Send event notification emails using unified mailer.js function
      if (process.env.EMAIL_ON_EVENT === 'true') {
        const emailPromises = students.map(s => {
          return sendEventNotificationEmail({
            to: s.email,
            event: {
              title: name,
              date: formatDateTime(startDate),
              details: description,
              templateUrl: tpl.templateUrl
            },
            interviewer: s.name || s.email,
            interviewee: ''
          }).catch(err => {
            console.error(`[createEvent] Failed to send email to ${s.email}:`, err.message);
            return null;
          });
        });
        
        await Promise.all(emailPromises);
        console.log(`[createEvent] Sent ${students.length} event notification emails`);
      }
    } catch (e) {
      console.error('[createEvent] Async email/pairing failed', e.message);
    }
  });
}

// Helper to normalize CSV row fields
function normalizeSpecialEventRow(row) {
  return {
    name: row.name || row.Name || row.NAME || '',
    email: (row.email || row.Email || row.EMAIL || '').trim().toLowerCase(),
    studentid: (row.studentid || row.studentId || row.StudentId || row.STUDENTID || row.studentID || row.student_id || '').toString().trim(),
    branch: row.branch || row.Branch || row.BRANCH || '',
    course: row.course || row.Course || row.COURSE || '',
    college: row.college || row.College || row.COLLEGE || '',
    password: row.password || row.Password || row.PASSWORD || '',
  };
}

// Validate special event CSV and return detailed results
export async function checkSpecialEventCsv(req, res) {
  if (!req.file) return res.status(400).json({ error: 'CSV file required' });
  
  const csvText = req.file.buffer.toString('utf8');
  let rows;
  try {
    rows = parse(csvText, { columns: true, skip_empty_lines: true });
  } catch (e) {
    return res.status(400).json({ error: 'Invalid CSV: ' + (e.message || e) });
  }

  const results = [];
  const requiredFields = ['name', 'email', 'studentid', 'branch'];
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  // Track duplicates inside the CSV
  const seenEmails = new Set();
  const seenStudentIds = new Set();

  const normalizedRows = rows.map((r, idx) => ({ ...normalizeSpecialEventRow(r), __row: idx + 2 }));

  for (const row of normalizedRows) {
    const { name, email, studentid, branch } = row;

    // Skip completely empty rows
    if (!email && !studentid && !name) continue;

    // Check required fields
    const missing = requiredFields.filter((f) => {
      if (f === 'studentid') return !studentid;
      if (f === 'name') return !name;
      if (f === 'email') return !email;
      if (f === 'branch') return !branch;
      return false;
    });
    
    if (missing.length > 0) {
      results.push({ row: row.__row, email, studentid, status: 'missing_fields', missing });
      continue;
    }

    // Validate email format
    if (!emailRegex.test(email)) {
      results.push({ row: row.__row, email, studentid, status: 'invalid_email' });
      continue;
    }

    // Check duplicates inside the CSV file
    if (seenEmails.has(email) || seenStudentIds.has(studentid)) {
      results.push({ row: row.__row, email, studentid, status: 'duplicate_in_file' });
      continue;
    }
    seenEmails.add(email);
    seenStudentIds.add(studentid);

    // Mark as ready to create (no database checks shown to user)
    results.push({ row: row.__row, email, studentid, status: 'ready' });
  }

  res.json({ count: results.length, results });
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

  // Parse CSV
  let rows;
  try {
    rows = parse(req.files.csv[0].buffer.toString('utf8'), { columns: true, skip_empty_lines: true });
  } catch (e) {
    throw new HttpError(400, 'Invalid CSV: ' + (e.message || e));
  }

  // Upload template first
  const tpl = await uploadTemplate(req.files?.template?.[0]);
  
  // Create event
  const event = await Event.create({
    name,
    description,
    startDate: start || undefined,
    endDate: end || undefined,
    ...tpl,
    isSpecial: true,
    allowedParticipants: [], // Will be filled with SpecialStudent IDs
    participants: [], // Will be filled with SpecialStudent IDs
  });

  // Process CSV and create SpecialStudent records
  const results = [];
  const requiredFields = ['name', 'email', 'studentid', 'branch'];
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const seenEmails = new Set();
  const seenStudentIds = new Set();
  const normalizedRows = rows.map((r, idx) => ({ ...normalizeSpecialEventRow(r), __row: idx + 2 }));
  const createdStudents = []; // For async email sending

  for (const row of normalizedRows) {
    const { course, name, email, studentid, password, branch, college } = row;

    // Skip completely empty rows
    if (!email && !studentid && !name) continue;

    // Check required fields
    const missing = requiredFields.filter((f) => {
      if (f === 'studentid') return !studentid;
      if (f === 'name') return !name;
      if (f === 'email') return !email;
      if (f === 'branch') return !branch;
      return false;
    });
    
    if (missing.length > 0) {
      results.push({ row: row.__row, email, studentid, status: 'missing_fields', missing });
      continue;
    }

    // Validate email format
    if (!emailRegex.test(email)) {
      results.push({ row: row.__row, email, studentid, status: 'invalid_email' });
      continue;
    }

    // Check duplicates inside the CSV
    if (seenEmails.has(email) || seenStudentIds.has(studentid)) {
      results.push({ row: row.__row, email, studentid, status: 'duplicate_in_file' });
      continue;
    }
    seenEmails.add(email);
    seenStudentIds.add(studentid);

    // Create or update SpecialStudent
    try {
      const defaultPassword = password || studentid;
      
      // First check if student exists in User collection
      const existingUser = await User.findOne({ 
        $or: [{ email }, { studentId: studentid }] 
      });
      
      if (existingUser) {
        // Student exists in User collection - add event to SpecialStudent with preserved User password
        let specialStudent = await SpecialStudent.findOne({
          $or: [{ email }, { studentId: studentid }]
        });
        
        if (specialStudent) {
          // SpecialStudent record exists - just add event if not already added
          if (!specialStudent.events.includes(event._id)) {
            specialStudent.events.push(event._id);
            await specialStudent.save();
            results.push({ 
              row: row.__row, 
              id: specialStudent._id, 
              email, 
              studentid, 
              status: 'added_event_to_existing',
              message: 'Student already exists - added to this event'
            });
          } else {
            results.push({ 
              row: row.__row, 
              id: specialStudent._id, 
              email, 
              studentid, 
              status: 'already_enrolled',
              message: 'Student already enrolled in this event'
            });
          }
        } else {
          // Create SpecialStudent with User's password
          specialStudent = await SpecialStudent.create({
            name: existingUser.name,
            email: existingUser.email,
            studentId: existingUser.studentId,
            branch: existingUser.branch || branch,
            course: existingUser.course || course,
            college: existingUser.college || college,
            events: [event._id],
            passwordHash: existingUser.passwordHash,
            mustChangePassword: existingUser.mustChangePassword,
          });
          
          results.push({ 
            row: row.__row, 
            id: specialStudent._id, 
            email, 
            studentid, 
            status: 'linked_from_users',
            message: 'Student exists in main database - linked with preserved password'
          });
        }
        
        // Add to createdStudents but don't send onboarding email
        createdStudents.push({
          _id: specialStudent._id,
          email: specialStudent.email,
          name: specialStudent.name,
          studentId: specialStudent.studentId,
          password: defaultPassword,
          shouldSendOnboarding: false, // Don't send - they already have credentials
        });
        continue;
      }

      // Check if student exists in SpecialStudent collection
      let specialStudent = await SpecialStudent.findOne({
        $or: [{ email }, { studentId: studentid }]
      });

      if (specialStudent) {
        // SpecialStudent exists - add event if not already added
        if (!specialStudent.events.includes(event._id)) {
          specialStudent.events.push(event._id);
          await specialStudent.save();
          
          results.push({ 
            row: row.__row, 
            id: specialStudent._id, 
            email, 
            studentid, 
            status: 'added_event_to_existing',
            message: 'Student already exists - added to this event with preserved password'
          });
        } else {
          results.push({ 
            row: row.__row, 
            id: specialStudent._id, 
            email, 
            studentid, 
            status: 'already_enrolled',
            message: 'Student already enrolled in this event'
          });
        }
        
        // Add to createdStudents but don't send onboarding email
        createdStudents.push({
          _id: specialStudent._id,
          email: specialStudent.email,
          name: specialStudent.name,
          studentId: specialStudent.studentId,
          password: defaultPassword,
          shouldSendOnboarding: false, // Don't send - they already have credentials
        });
      } else {
        // New student - create SpecialStudent with CSV password
        const passwordHash = await User.hashPassword(defaultPassword);
        
        specialStudent = await SpecialStudent.create({
          name,
          email,
          studentId: studentid,
          branch,
          course: course || undefined,
          college: college || undefined,
          events: [event._id],
          passwordHash,
          mustChangePassword: true,
        });
        
        results.push({ row: row.__row, id: specialStudent._id, email, studentid, status: 'created' });
        
        // Add to createdStudents and send onboarding email
        createdStudents.push({
          _id: specialStudent._id,
          email: specialStudent.email,
          name: specialStudent.name,
          studentId: specialStudent.studentId,
          password: defaultPassword,
          shouldSendOnboarding: true, // Send onboarding email
        });
      }
    } catch (err) {
      results.push({ row: row.__row, email, studentid, status: 'error', message: err.message });
    }
  }

  // Update event with created student IDs
  event.allowedParticipants = createdStudents.map(s => s._id);
  event.participants = createdStudents.map(s => s._id);
  await event.save();

  // Send response immediately
  res.status(201).json({
    eventId: event._id,
    invited: createdStudents.length,
    name: event.name,
    results,
  });

  // Send emails and generate pairs asynchronously (non-blocking)
  setImmediate(async () => {
    try {
      console.log(`[createSpecialEvent] Processing ${createdStudents.length} special students for event: ${event._id}`);
      
      // Generate pairs but don't send pairing emails at creation
      if (createdStudents.length >= 2) {
        const ids = createdStudents.map(s => s._id.toString());
        const pairs = ids.map((id, i) => [id, ids[(i + 1) % ids.length]]);
        
        await Pair.deleteMany({ event: event._id });
        await Pair.insertMany(
          pairs.map(([a, b]) => ({
            event: event._id,
            interviewer: a,
            interviewee: b,
          }))
        );
        
        console.log(`[createSpecialEvent] Created ${pairs.length} pairs`);
      }

      // Send onboarding emails to special students in parallel (only for new students)
      if (process.env.EMAIL_ON_ONBOARD === 'true' && createdStudents.length > 0) {
        const studentsNeedingOnboarding = createdStudents.filter(s => s.shouldSendOnboarding);
        
        if (studentsNeedingOnboarding.length > 0) {
          const emailPromises = studentsNeedingOnboarding.map(student =>
            sendOnboardingEmail({
              to: student.email,
              studentId: student.studentId,
              password: student.password,
            }).catch(err => {
              console.error(`[createSpecialEvent] Failed to send onboarding email to ${student.email}:`, err.message);
              return null;
            })
          );

          await Promise.all(emailPromises);
          console.log(`[createSpecialEvent] Sent onboarding emails to ${studentsNeedingOnboarding.length} new special students`);
        } else {
          console.log(`[createSpecialEvent] No new students requiring onboarding emails`);
        }
      }

      // Send event notification emails using unified mailer.js function
      if (process.env.EMAIL_ON_EVENT === 'true') {
        const emailPromises = createdStudents.map(s => {
          return sendEventNotificationEmail({
            to: s.email,
            event: {
              title: event.name,
              date: formatDateTime(startDate),
              details: description,
              templateUrl: event.templateUrl
            },
            interviewer: s.name || s.email,
            interviewee: ''
          }).catch(err => {
            console.error(`[createSpecialEvent] Failed to send event email to ${s.email}:`, err.message);
            return null;
          });
        });

        await Promise.all(emailPromises);
        console.log(`[createSpecialEvent] Sent ${createdStudents.length} event notification emails`);
      }

      console.log(`[createSpecialEvent] Successfully processed event: ${event._id}`);
    } catch (e) {
      console.error('[createSpecialEvent] Async processing failed:', e.message);
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
  const isSpecialStudent = req.user?.isSpecialStudent || false;
  
  // Debug logging
  console.log('[listEvents] User info:', {
    userId: userId?.toString(),
    role: req.user?.role,
    isSpecialStudent,
    userType: isSpecialStudent ? 'SpecialStudent' : 'User'
  });
  
  const events = await Event.find().sort({ createdAt: -1 }).lean();
  
  console.log('[listEvents] Total events:', events.length);
  console.log('[listEvents] Special events:', events.filter(e => e.isSpecial).map(e => ({
    id: e._id.toString(),
    name: e.name,
    allowedParticipants: e.allowedParticipants?.map(p => p.toString())
  })));
  
  // If user is a regular User, check if they also exist as SpecialStudent
  let specialStudentId = null;
  if (!isSpecialStudent && userId && req.user?.email) {
    const specialStudent = await SpecialStudent.findOne({
      $or: [
        { email: req.user.email },
        { studentId: req.user.studentId }
      ]
    });
    if (specialStudent) {
      specialStudentId = specialStudent._id;
      console.log('[listEvents] User also exists as SpecialStudent:', specialStudentId.toString());
    }
  }
  
  const visible = events.filter(e => {
    // Non-special events are visible to everyone
    if (!e.isSpecial) return true;
    
    // Admins see all events
    if (isAdmin) return true;
    
    // Special students can only see events they're enrolled in
    if (isSpecialStudent && userId) {
      const canSee = e.allowedParticipants?.some?.(p => p.toString() === userId.toString());
      console.log('[listEvents] Special event check:', {
        eventName: e.name,
        eventId: e._id.toString(),
        userId: userId.toString(),
        allowedParticipants: e.allowedParticipants?.map(p => p.toString()),
        canSee
      });
      return canSee;
    }
    
    // Regular students - check if they exist as SpecialStudent and are allowed
    if (specialStudentId) {
      const canSee = e.allowedParticipants?.some?.(p => p.toString() === specialStudentId.toString());
      console.log('[listEvents] User as SpecialStudent check:', {
        eventName: e.name,
        specialStudentId: specialStudentId.toString(),
        allowedParticipants: e.allowedParticipants?.map(p => p.toString()),
        canSee
      });
      return canSee;
    }
    
    // Regular students cannot see special events (unless enrolled - checked above)
    if (!userId) return false;
    return e.allowedParticipants?.some?.(p => p.toString() === userId.toString());
  });
  
  console.log('[listEvents] Visible events:', visible.length);
  
  // For joined status, check both User ID and SpecialStudent ID
  const mapped = visible.map(e => {
    let joined = false;
    if (userId) {
      joined = e.participants?.some?.(p => p.toString() === userId.toString());
    }
    // Also check SpecialStudent ID if exists
    if (!joined && specialStudentId) {
      joined = e.participants?.some?.(p => p.toString() === specialStudentId.toString());
    }
    return { ...e, joined };
  });
  
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
