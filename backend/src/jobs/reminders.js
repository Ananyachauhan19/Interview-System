import cron from 'node-cron';
import Pair from '../models/Pair.js';
import { sendMail } from '../utils/mailer.js';

// Run every 5 minutes to send reminders
cron.schedule('*/5 * * * *', async () => {
  const now = new Date();
  const oneHour = new Date(now.getTime() + 60 * 60 * 1000);
  const oneDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const pairs = await Pair.find({ scheduledAt: { $gte: now, $lte: oneDay } }).populate('interviewer interviewee');
  for (const p of pairs) {
    const diff = p.scheduledAt - now;
    const emails = [p.interviewer?.email, p.interviewee?.email].filter(Boolean);
    let subject;
    if (diff <= 60 * 60 * 1000) subject = 'Interview in 1 hour';
    else subject = 'Interview in 1 day';
    for (const to of emails) await sendMail({ to, subject, text: `Time: ${p.scheduledAt.toISOString()} | Link: ${p.meetingLink || 'TBA'}` });
  }
});
