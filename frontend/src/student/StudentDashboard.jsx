import { useEffect, useState } from "react";
import { api } from "../utils/api";

export default function StudentDashboard() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [ackRead, setAckRead] = useState(false);
  const [joinMsg, setJoinMsg] = useState("");

  useEffect(() => { api.listEvents().then(setEvents).catch(console.error); }, []);

  // Show event details
  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setJoinMsg("");
    setAckRead(false);
    // Refresh template URL (will generate signed URL if needed)
    api.getEventTemplateUrl(event._id)
      .then((res) => {
        if (res?.templateUrl) {
          setSelectedEvent((prev) => prev ? { ...prev, templateUrl: res.templateUrl } : prev);
        }
      })
      .catch(() => {});
  };

  // Register student for event (frontend only)
  const handleJoinEvent = async () => {
    // If a template exists, require acknowledgment; otherwise allow join directly
    if (selectedEvent?.templateUrl && !ackRead) { setJoinMsg("Please confirm you have read the template."); return; }
    try {
      const res = await api.joinEvent(selectedEvent._id);
      setJoinMsg(res?.message || "Successfully joined the event!");
      // Mark as joined locally and update the events list
      setSelectedEvent(prev => prev ? { ...prev, joined: true } : prev);
      setEvents(prev => prev.map(e => e._id === selectedEvent._id ? { ...e, joined: true } : e));
    } catch (err) { setJoinMsg(err.message); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-2xl w-full mx-auto">
        <h2 className="text-3xl font-extrabold mb-4 text-blue-700 text-center tracking-tight">Student Dashboard</h2>
        {!selectedEvent ? (
          <div>
            <h3 className="font-semibold mb-4 text-lg text-gray-700">Available Events:</h3>
            <ul className="divide-y divide-gray-200">
              {events.map((event) => (
                <li key={event._id} className="py-4 cursor-pointer hover:bg-blue-50 rounded-xl px-4 transition" onClick={() => handleEventClick(event)}>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-lg text-blue-700">{event.name}</span>
                    <span className="text-gray-500 text-sm">{new Date(event.startDate).toLocaleString()}</span>
                  </div>
                  <div className="text-gray-500 text-sm mt-1">{event.description}</div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div>
            <button className="mb-4 text-blue-600 hover:underline font-semibold" onClick={() => setSelectedEvent(null)}>
              ← Back to Events
            </button>
            <h3 className="text-2xl font-bold mb-2 text-blue-700">{selectedEvent.name}</h3>
            <div className="mb-2 text-gray-500">Start: {new Date(selectedEvent.startDate).toLocaleString()} | End: {new Date(selectedEvent.endDate).toLocaleString()}</div>
            <div className="mb-4 text-gray-700">{selectedEvent.description}</div>
            {selectedEvent.templateUrl && (
              <div className="mb-4">
                <a
                  href={selectedEvent.templateUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-semibold"
                >
                  View template{selectedEvent.templateName ? `: ${selectedEvent.templateName}` : ''}
                </a>
              </div>
            )}
            {!selectedEvent.joined ? (
              <>
                {selectedEvent.templateUrl && (
                  <label className="flex items-center gap-2 mb-4">
                    <input type="checkbox" checked={ackRead} onChange={(e) => setAckRead(e.target.checked)} />
                    <span>I have read the event template/instructions.</span>
                  </label>
                )}
                <button
                  onClick={handleJoinEvent}
                  disabled={selectedEvent.templateUrl ? !ackRead : false}
                  className={`px-6 py-3 rounded-xl font-bold shadow-lg transition text-lg w-full md:w-auto ${selectedEvent.templateUrl && !ackRead ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                >
                  Join Event
                </button>
              </>
            ) : (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-100 text-green-700 font-semibold">
                ✔ Joined
              </div>
            )}
            {joinMsg && (
              <div className={`mt-2 text-center ${joinMsg.toLowerCase().includes('fail') || joinMsg.toLowerCase().includes('error') ? 'text-red-600' : 'text-green-600'}`}>
                {joinMsg}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
