import { useState, useEffect } from "react";
import { api } from "../utils/api";

export default function SessionAndFeedback() {
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState("");
  const [pairs, setPairs] = useState([]);
  const [activePair, setActivePair] = useState(null);
  const [marks, setMarks] = useState("");
  const [comments, setComments] = useState("");
  const [notification, setNotification] = useState("");

  useEffect(() => { api.listEvents().then(setEvents).catch(console.error); }, []);
  useEffect(() => { if (eventId) api.listPairs(eventId).then(setPairs).catch(console.error); }, [eventId]);

  const submit = async (e) => {
    e.preventDefault();
    if (!activePair) return;
    try {
      await api.submitFeedback(activePair._id, Number(marks), comments);
      setNotification("Feedback submitted");
      setActivePair(null);
      setMarks(""); setComments("");
    } catch (err) { setNotification(err.message); }
  };

  // --

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-2xl w-full mx-auto">
        <h2 className="text-3xl font-extrabold mb-4 text-blue-700 text-center tracking-tight">Session & Feedback</h2>
        {notification && (
          <div className="mb-6 text-green-600 font-bold text-center">{notification}</div>
        )}
        <div className="mb-6">
          <label className="block text-sm text-gray-600 mb-1">Select Event</label>
          <select className="w-full border p-3 rounded-xl" value={eventId} onChange={(e) => setEventId(e.target.value)}>
            <option value="">-- choose --</option>
            {events.map((e) => (<option key={e._id} value={e._id}>{e.name}</option>))}
          </select>
        </div>
        <h3 className="font-semibold mb-4 text-lg text-gray-700">Scheduled Sessions:</h3>
        <ul className="divide-y divide-gray-200 mb-8">
          {pairs.filter((p) => p.scheduledAt).map((p) => (
            <li key={p._id} className="py-4">
              <div>
                <span className="font-bold text-blue-700">{p.interviewer?.email} ➜ {p.interviewee?.email}</span> <br />
                <span className="text-gray-500">Time: {new Date(p.scheduledAt).toLocaleString()}</span>
              </div>
              {p.meetingLink && (
                <div className="mt-2">
                  <span className="text-blue-600 font-semibold">Meeting Link: </span>
                  <a href={p.meetingLink} className="text-blue-600 underline font-semibold" target="_blank" rel="noopener noreferrer">
                    {p.meetingLink}
                  </a>
                </div>
              )}
              <button className="mt-2 text-sm text-purple-700" onClick={() => setActivePair(p)}>Fill Feedback</button>
            </li>
          ))}
        </ul>
        {activePair && (
          <div className="bg-gray-50 p-8 rounded-xl">
            <h3 className="font-semibold mb-4 text-lg text-blue-700">Session Feedback</h3>
            <form onSubmit={submit}>
              <div className="mb-6">
                <label className="block mb-2 font-semibold text-gray-700">Marks out of 100</label>
                <input type="number" min="0" max="100" value={marks} onChange={(e) => setMarks(e.target.value)} className="w-full border p-4 rounded-xl" required />
              </div>
              <div className="mb-6">
                <label className="block mb-2 font-semibold text-gray-700">Comments</label>
                <input type="text" value={comments} onChange={(e) => setComments(e.target.value)} className="w-full border p-4 rounded-xl" required />
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition text-lg">Submit Feedback</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
