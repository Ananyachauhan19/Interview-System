import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  } : undefined,
});

export async function sendMail({ to, subject, html, text, attachments }) {
  const from = process.env.MAIL_FROM || process.env.SMTP_USER || 'noreply@example.com';
  return transporter.sendMail({ from, to, subject, html, text, attachments });
}

export function renderTemplate(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

// Simple iCal (ICS) event generator
export function buildICS({ uid, start, end, summary, description, url, organizer, attendees = [] }) {
  const dt = (d) => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Interview System//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dt(Date.now())}`,
    `DTSTART:${dt(start)}`,
    `DTEND:${dt(end)}`,
    `SUMMARY:${summary}`,
    description ? `DESCRIPTION:${description.replace(/\n/g, '\\n')}` : null,
    url ? `URL:${url}` : null,
    organizer ? `ORGANIZER;CN=${organizer.name}:MAILTO:${organizer.email}` : null,
    ...attendees.map(a => `ATTENDEE;CN=${a.name};ROLE=REQ-PARTICIPANT:MAILTO:${a.email}`),
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(Boolean);
  return lines.join('\r\n');
}
