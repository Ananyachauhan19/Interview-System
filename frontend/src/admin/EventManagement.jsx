import { useEffect, useState } from "react";
import { api } from "../utils/api";

export default function EventManagement() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [template, setTemplate] = useState(null);
  const [events, setEvents] = useState([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api.listEvents().then(setEvents).catch(console.error);
  }, []);

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    try {
      const ev = await api.createEvent({ name: title, description, startDate, endDate, template });
      setEvents([ev, ...events]);
      setMsg("Event created");
    } catch (err) {
      setMsg(err.message);
    }
  };

  const handleExport = async (id) => {
    try {
      const csv = await api.exportParticipantsCsv(id);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `participants_${id}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch (err) { setMsg(err.message); }
  };

  const handleGeneratePairs = async (id) => {
    try {
      const res = await api.generatePairs(id);
      setMsg(`Generated ${res.count} pairs`);
    } catch (err) { setMsg(err.message); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-xl w-full mx-auto">
        <h2 className="text-3xl font-extrabold mb-4 text-blue-700 text-center tracking-tight">Event Management</h2>
        <form onSubmit={handleCreateEvent} className="mb-8">
          <input
            type="text"
            placeholder="Event Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-gray-300 p-4 mb-4 rounded-xl focus:ring-2 focus:ring-blue-400 focus:outline-none text-lg"
            required
          />
          <textarea
            placeholder="Event Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border border-gray-300 p-4 mb-4 rounded-xl focus:ring-2 focus:ring-blue-400 focus:outline-none text-lg"
            required
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full border border-gray-300 p-4 rounded-xl focus:ring-2 focus:ring-blue-400 focus:outline-none text-lg" />
            <input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full border border-gray-300 p-4 rounded-xl focus:ring-2 focus:ring-blue-400 focus:outline-none text-lg" />
          </div>
          <input type="file" onChange={(e) => setTemplate(e.target.files?.[0] || null)} className="w-full border border-gray-300 p-3 mt-4 rounded-xl" />
          <button
            type="submit"
            className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition text-lg"
          >
            Create Event
          </button>
        </form>
        {msg && <div className="text-center text-sm text-gray-600 mb-4">{msg}</div>}
        <h3 className="font-semibold mb-2">Existing Events</h3>
        <ul className="divide-y divide-gray-200">
          {events.map((e) => (
            <li key={e._id} className="py-3 flex justify-between items-center">
              <div>
                <div className="font-bold text-blue-700">{e.name}</div>
                <div className="text-sm text-gray-500">{new Date(e.startDate).toLocaleString()} → {new Date(e.endDate).toLocaleString()}</div>
                {e.templateUrl && (
                  <a href={e.templateUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">View template{e.templateName ? `: ${e.templateName}` : ''}</a>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleGeneratePairs(e._id)} className="bg-green-700 text-white px-3 py-2 rounded-xl text-sm">Generate Pairs</button>
                <button onClick={() => handleExport(e._id)} className="bg-gray-800 text-white px-3 py-2 rounded-xl text-sm">Export CSV</button>
                <label className="bg-white border px-3 py-2 rounded-xl text-sm cursor-pointer">
                  <input type="file" className="hidden" onChange={async (ev) => {
                    const file = ev.target.files?.[0];
                    if (!file) return;
                    try {
                      const updated = await api.updateEventTemplate(e._id, file);
                      setEvents((prev) => prev.map((x) => x._id === e._id ? updated : x));
                      setMsg('Template updated');
                    } catch (err) { setMsg(err.message); }
                    ev.target.value = '';
                  }} />
                  Replace Template
                </label>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
