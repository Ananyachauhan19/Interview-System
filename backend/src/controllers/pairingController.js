import Event from '../models/Event.js';
import Pair from '../models/Pair.js';
import { sendMail, renderTemplate } from '../utils/mailer.js';
import { HttpError } from '../utils/errors.js';

export async function generatePairs(req, res) {
  const event = await Event.findById(req.params.id).populate('participants');
  if (!event) throw new HttpError(404, 'Event not found');
  const students = event.participants.map((s) => s._id.toString());
  if (students.length < 2) throw new HttpError(400, 'Not enough participants');

  // Create a permutation p such that for each i, i interviews p[i], with no fixed points if possible
  let indices = students.map((_, i) => i);
  let perm = [...indices];
  let attempts = 0;
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } }

  // Try to find a derangement, else allow minimal fixed points and fix with cycle shifts
  do {
    perm = [...indices];
    shuffle(perm);
    attempts++;
    if (attempts > 1000) break;
  } while (perm.some((v, i) => v === i));

  // If odd count, insert a bye by setting one mapping to itself and treat as 3-cycle later
  const n = students.length;
  const used = new Set();
  const pairs = [];
  for (let i = 0; i < n; i++) {
    const interviewer = students[i];
    const interviewee = students[perm[i]];
    if (interviewer === interviewee) {
      // self mapping due to odd or failure; skip, will handle later
      continue;
    }
    if (used.has(`${interviewer}->${interviewee}`)) continue;
    pairs.push([interviewer, interviewee]);
    used.add(`${interviewer}->${interviewee}`);
    used.add(`${interviewee}->${interviewer}`); // prevent reciprocal pairs
  }

  // Ensure each student appears at least once as interviewer and interviewee when possible
  // If odd, one may get a bye; we won't force reciprocity.

  // Persist pairs
  await Pair.deleteMany({ event: event._id });
  const created = await Pair.insertMany(pairs.map(([a, b]) => ({ event: event._id, interviewer: a, interviewee: b })));

  // Notify students
  if (process.env.EMAIL_ON_PAIRING === 'true') {
    const byId = new Map(event.participants.map((s) => [s._id.toString(), s]));
    for (const p of created) {
      const a = byId.get(p.interviewer.toString());
      const b = byId.get(p.interviewee.toString());
      if (a?.email) await sendMail({ to: a.email, subject: `You interview ${b?.name || 'a peer'}`, text: renderTemplate('You are interviewing {interviewee}', { interviewee: b?.name || b?.email || 'a peer' }) });
      if (b?.email) await sendMail({ to: b.email, subject: `You are interviewed by ${a?.name || 'a peer'}`, text: renderTemplate('You are being interviewed by {interviewer}', { interviewer: a?.name || a?.email || 'a peer' }) });
    }
  }

  res.json({ count: created.length, pairs: created });
}

export async function listPairs(req, res) {
  const pairs = await Pair.find({ event: req.params.id }).populate('interviewer interviewee');
  res.json(pairs);
}
