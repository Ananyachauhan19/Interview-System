import Feedback from '../models/Feedback.js';
import Pair from '../models/Pair.js';
import Event from '../models/Event.js';
import { HttpError } from '../utils/errors.js';

export async function submitFeedback(req, res) {
  const { pairId, marks, comments } = req.body;
  const pair = await Pair.findById(pairId);
  if (!pair) throw new HttpError(404, 'Pair not found');
  const to = pair.interviewer.equals(req.user._id) ? pair.interviewee : pair.interviewer;
  const fb = await Feedback.findOneAndUpdate(
    { event: pair.event, pair: pair._id, from: req.user._id, to },
    { marks, comments },
    { upsert: true, new: true }
  );
  res.json(fb);
}

export async function exportEventFeedback(req, res) {
  const eventId = req.params.id;
  const event = await Event.findById(eventId);
  if (!event) throw new HttpError(404, 'Event not found');
  const list = await Feedback.find({ event: eventId }).populate('from to');
  const header = 'event,from,to,marks,comments\n';
  const rows = list.map((f) => [
    event.name,
    f.from?.name || f.from?.email || f.from?._id,
    f.to?.name || f.to?.email || f.to?._id,
    f.marks,
    JSON.stringify(f.comments || ''),
  ].join(','));
  const csv = header + rows.join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="event_${eventId}_feedback.csv"`);
  res.send(csv);
}
