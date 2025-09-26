import { useEffect, useState } from "react";
import { api } from "../utils/api";
import { Link } from 'react-router-dom';

export default function EventManagement() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [template, setTemplate] = useState(null);
  const [events, setEvents] = useState([]);
  const [msg, setMsg] = useState("");
  const [specialMode, setSpecialMode] = useState(false);
  const [csvFile, setCsvFile] = useState(null);

  useEffect(() => {
    api.listEvents().then(setEvents).catch(console.error);
  }, []);

  const resetForm = () => {
    setTitle(""); setDescription(""); setStartDate(""); setEndDate(""); setTemplate(null); setCsvFile(null);
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    try {
      let ev;
      if (specialMode) {
        const res = await api.createSpecialEvent({ name: title, description, startDate, endDate, template, csv: csvFile });
        setMsg(`Special event created (invited ${res.invited})`);
      } else {
        ev = await api.createEvent({ name: title, description, startDate, endDate, template });
        setEvents([ev, ...events]);
        setMsg("Event created");
      }
      resetForm();
    } catch (err) {
      setMsg(err.message);
    }
  };

  // Removed export/generate/replace controls per request

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-xl w-full mx-auto">
        <h2 className="text-3xl font-extrabold mb-4 text-blue-700 text-center tracking-tight">Event Management</h2>
        <div className="flex justify-end mb-2">
          <button type="button" onClick={() => { setSpecialMode(!specialMode); setMsg(""); }} className={`text-xs px-3 py-1 rounded-full border ${specialMode ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-purple-700 border-purple-600'}`}>{specialMode ? 'Special Event Mode ON' : 'Normal Event Mode'}</button>
        </div>
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
          {specialMode && (
            <div className="mt-4">
              <label className="block text-sm font-semibold mb-1 text-purple-700">Allowed Participants CSV</label>
              <input type="file" accept=".csv" onChange={(e) => setCsvFile(e.target.files?.[0] || null)} className="w-full border border-gray-300 p-3 rounded-xl" required={specialMode} />
              <p className="text-[11px] text-gray-500 mt-1">CSV headers: email or studentId (case-insensitive). Only listed users will see & join this event.</p>
            </div>
          )}
          <button
            type="submit"
            className={`w-full ${specialMode ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'} text-white p-4 rounded-xl font-bold shadow-lg transition text-lg`}
          >
            {specialMode ? 'Create Special Event' : 'Create Event'}
          </button>
        </form>
        {msg && <div className="text-center text-sm text-gray-600 mb-4">{msg}</div>}
        <h3 className="font-semibold mb-2">Existing Events</h3>
        <ul className="divide-y divide-gray-200">
          {events.map((e) => (
            <li key={e._id} className="py-3 flex justify-between items-center">
              <div>
                <div className="font-bold text-blue-700">{e.name}{e.isSpecial && <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Special</span>}</div>
                <div className="text-sm text-gray-500">{new Date(e.startDate).toLocaleString()} → {new Date(e.endDate).toLocaleString()}</div>
                {e.templateUrl && (
                  <a href={e.templateUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">View template{e.templateName ? `: ${e.templateName}` : ''}</a>
                )}
              </div>
              <div className="flex gap-2">
                <Link to={`/admin/event/${e._id}`} className="bg-blue-600 text-white px-3 py-2 rounded-xl text-sm">Details</Link>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
