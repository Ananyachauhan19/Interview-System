import cron from 'node-cron';
import crypto from 'crypto';
import Pair from '../models/Pair.js';
import { sendMail, buildICS } from '../utils/mailer.js';

// Run every 5 minutes to send reminders
cron.schedule('*/5 * * * *', async () => {
  const now = new Date();
  const oneHour = new Date(now.getTime() + 60 * 60 * 1000);
  const oneDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const pairs = await Pair.find({ scheduledAt: { $gte: now, $lte: oneDay } }).populate('interviewer interviewee');
  for (const p of pairs) {
    const diff = p.scheduledAt - now;
    const emails = [p.interviewer?.email, p.interviewee?.email].filter(Boolean);
    // Auto-generate meeting link within 1 hour window if not already generated
    if (!p.meetingLink && diff <= 60 * 60 * 1000) {
      const base = (process.env.MEETING_LINK_BASE || 'https://meet.example.com').replace(/\/$/, '');
      const token = crypto.randomUUID();
      p.meetingLink = `${base}/${token}`;
      await p.save();
      const subjectLink = 'Meeting link available';
      const textLink = `Your interview at ${p.scheduledAt.toISOString()} now has a meeting link: ${p.meetingLink}`;
      // Build ICS
      const end = new Date(p.scheduledAt.getTime() + 30 * 60 * 1000);
      const ics = buildICS({
        uid: `${p._id}@interview-system`,
        start: p.scheduledAt,
        end,
        summary: 'Interview Session',
        description: 'Scheduled interview session',
        url: p.meetingLink,
        organizer: { name: p.interviewer?.name || 'Interviewer', email: p.interviewer?.email },
        attendees: [
          { name: p.interviewer?.name || 'Interviewer', email: p.interviewer?.email },
          { name: p.interviewee?.name || 'Interviewee', email: p.interviewee?.email },
        ].filter(a => a.email),
      });
      const attachments = [{ filename: 'interview.ics', content: ics, contentType: 'text/calendar; charset=utf-8; method=REQUEST' }];
      for (const to of emails) await sendMail({ to, subject: subjectLink, text: textLink, attachments });
    }
    let subject;
    if (diff <= 60 * 60 * 1000) subject = 'Interview in 1 hour';
    else subject = 'Interview in 1 day';
    const showLink = diff <= 60 * 60 * 1000 && p.meetingLink;
    for (const to of emails) await sendMail({ to, subject, text: `Time: ${p.scheduledAt.toISOString()} | Link: ${showLink ? p.meetingLink : 'TBA'}` });
  }
});
