// Onboarding email: StudentId & Password
export async function sendOnboardingEmail({ to, studentId, password }) {
  const subject = 'Welcome to the Interview System';
  const html = `
    <div style="font-family:Arial,sans-serif;font-size:15px;color:#222;">
      <p>Dear Student,</p>
      <p>Welcome to the Interview System! Your account has been successfully created.</p>
      <p>
        <strong>Student ID:</strong> {studentId}<br/>
        <strong>Password:</strong> {password}
      </p>
      <p>Please log in and change your password after your first login for security reasons.</p>
      <p>Best regards,<br/>Interview System Team</p>
    </div>
  `;
  return sendMail({ to, subject, html: renderTemplate(html, { studentId, password }) });
}

// Event notification email
export async function sendEventNotificationEmail({ to, event, interviewer, interviewee }) {
  const subject = `Interview Event Scheduled: ${event.title}`;
  const html = `
    <div style="font-family:Arial,sans-serif;font-size:15px;color:#222;">
      <p>Dear Student,</p>
      <p>A new interview event has been scheduled for you. Please find the details below:</p>
      <p>
        <strong>Event:</strong> {title}<br/>
        <strong>Date:</strong> {date}<br/>
        <strong>Details:</strong> {details}
      </p>
      <p>
        <strong>Your Interviewer Partner:</strong> {interviewer}<br/>
        <strong>Your Interviewee Partner:</strong> {interviewee}
      </p>
      <p>Prepare well and check your dashboard for further instructions.</p>
      <p>Best regards,<br/>Interview System Team</p>
    </div>
  `;
  return sendMail({
    to,
    subject,
    html: renderTemplate(html, {
      title: event.title,
      date: event.date,
      details: event.details,
      interviewer,
      interviewee,
    }),
  });
}

// Slot proposal email (to interviewee)
export async function sendSlotProposalEmail({ to, interviewer, slot }) {
  const subject = 'Interview Slot Proposal';
  const html = `
    <div style="font-family:Arial,sans-serif;font-size:15px;color:#222;">
      <p>Dear Student,</p>
      <p>Your interviewer <strong>{interviewer}</strong> has proposed the following time slot for your interview:</p>
      <p><strong>Proposed Slot:</strong> {slot}</p>
      <p>Please review this slot in your dashboard and accept or propose a new time if needed.</p>
      <p>Best regards,<br/>Interview System Team</p>
    </div>
  `;
  return sendMail({ to, subject, html: renderTemplate(html, { interviewer, slot }) });
}

// Slot acceptance/notification email (to interviewer)
export async function sendSlotAcceptanceEmail({ to, interviewee, slot, accepted }) {
  const subject = accepted ? 'Interview Slot Accepted' : 'New Slot Proposal from Interviewee';
  const html = accepted
    ? `<div style="font-family:Arial,sans-serif;font-size:15px;color:#222;">
        <p>Dear Interviewer,</p>
        <p>Your proposed slot <strong>{slot}</strong> has been accepted by <strong>{interviewee}</strong>.</p>
        <p>Please check your dashboard for the updated schedule.</p>
        <p>Best regards,<br/>Interview System Team</p>
      </div>`
    : `<div style="font-family:Arial,sans-serif;font-size:15px;color:#222;">
        <p>Dear Interviewer,</p>
        <p><strong>{interviewee}</strong> has proposed a new slot: <strong>{slot}</strong>.</p>
        <p>Please review and respond in your dashboard.</p>
        <p>Best regards,<br/>Interview System Team</p>
      </div>`;
  return sendMail({ to, subject, html: renderTemplate(html, { interviewee, slot }) });
}

// Interview scheduled email (to both, with link)
export async function sendInterviewScheduledEmail({ to, interviewer, interviewee, event, link }) {
  const subject = 'Your Interview is Scheduled';
  const html = `
    <div style="font-family:Arial,sans-serif;font-size:15px;color:#222;">
      <p>Dear Participant,</p>
      <p>Your interview has been scheduled. Please find the details below:</p>
      <p>
        <strong>Event:</strong> {title}<br/>
        <strong>Date:</strong> {date}<br/>
        <strong>Details:</strong> {details}
      </p>
      <p>
        <strong>Interviewer:</strong> {interviewer}<br/>
        <strong>Interviewee:</strong> {interviewee}
      </p>
      <p>
        <strong>Interview Link:</strong> <a href="{link}">{link}</a>
      </p>
      <p>Please join the interview on time and ensure you are prepared.</p>
      <p>Best regards,<br/>Interview System Team</p>
    </div>
  `;
  return sendMail({
    to,
    subject,
    html: renderTemplate(html, {
      title: event.title,
      date: event.date,
      details: event.details,
      interviewer,
      interviewee,
      link,
    }),
  });
}
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
  const info = await transporter.sendMail({ from, to, subject, html, text, attachments });
  console.log(`[MAIL] Sent to: ${to} | Subject: ${subject}`);
  return info;
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
