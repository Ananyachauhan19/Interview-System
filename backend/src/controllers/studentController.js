import Papa from 'papaparse';
import User from '../models/User.js';
import { sendMail, renderTemplate } from '../utils/mailer.js';

export async function uploadStudentsCsv(req, res) {
  if (!req.file) return res.status(400).json({ error: 'CSV file required' });
  const csvText = req.file.buffer.toString('utf8');
  const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
  const rows = parsed.data;
  const results = [];
  for (const row of rows) {
    const { course, name, email, studentid, password, branch, college } = normalizeRow(row);
    if (!email && !studentid) continue;
    const exists = await User.findOne({ $or: [{ email }, { studentId: studentid }] });
    if (exists) {
      results.push({ email, studentid, status: 'exists' });
      continue;
    }
    const passwordHash = await User.hashPassword(password || generateTempPassword());
    const user = await User.create({
      role: 'student', course, name, email, studentId: studentid, passwordHash, branch, college,
      mustChangePassword: true,
    });
    results.push({ id: user._id, email, studentid, status: 'created' });
    if (process.env.EMAIL_ON_ONBOARD === 'true' && email) {
      await sendMail({
        to: email,
        subject: 'Welcome to Interview System',
        text: renderTemplate('Hello {studentName}, you have been onboarded.', { studentName: name || email }),
      });
    }
  }
  res.json({ count: results.length, results });
}

function normalizeRow(r) {
  const map = {};
  for (const [k, v] of Object.entries(r)) map[k.trim().toLowerCase()] = (v ?? '').toString().trim();
  return {
    course: map.course,
    name: map.name,
    email: map.email,
    studentid: map.studentid || map.student_id || map.sid,
    password: map.password,
    branch: map.branch,
    college: map.college,
  };
}

function generateTempPassword() {
  return Math.random().toString(36).slice(2, 10);
}
