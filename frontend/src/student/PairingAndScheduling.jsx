import { useEffect, useState } from "react";
import { api } from "../utils/api";

export default function PairingAndScheduling() {
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState("");
  const [pairs, setPairs] = useState([]);
  const [selectedPair, setSelectedPair] = useState(null);
  const [slots, setSlots] = useState([""]);
  const [message, setMessage] = useState("");

  useEffect(() => { api.listEvents().then(setEvents).catch(console.error); }, []);
  useEffect(() => { if (eventId) api.listPairs(eventId).then(setPairs).catch(console.error); }, [eventId]);

  const handlePropose = async () => {
    setMessage("");
    const isoSlots = slots.filter(Boolean);
    if (!selectedPair || isoSlots.length === 0) return;
    try {
      const res = await api.proposeSlots(selectedPair._id, isoSlots);
      if (res.common) setMessage(`Common slot found: ${res.common}`);
      else setMessage("Slots proposed. Waiting for partner.");
    } catch (err) { setMessage(err.message); }
  };

  const handleConfirm = async (dt, link) => {
    if (!selectedPair) return;
    try {
      await api.confirmSlot(selectedPair._id, dt, link);
      setMessage("Scheduled!");
      // refresh pairs to reflect scheduledAt
      const updated = await api.listPairs(eventId);
      setPairs(updated);
    } catch (err) { setMessage(err.message); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-2xl w-full mx-auto">
        <h2 className="text-3xl font-extrabold mb-4 text-blue-700 text-center tracking-tight">Pairing & Scheduling</h2>
        <div className="mb-6">
          <label className="block text-sm text-gray-600 mb-1">Select Event</label>
          <select className="w-full border p-3 rounded-xl" value={eventId} onChange={(e) => setEventId(e.target.value)}>
            <option value="">-- choose --</option>
            {events.map((e) => (<option key={e._id} value={e._id}>{e.name}</option>))}
          </select>
        </div>
        {pairs.length > 0 && (
          <div>
            <h3 className="font-semibold mb-4 text-lg text-gray-700">Student Pairs:</h3>
            <ul className="divide-y divide-gray-200 mb-8">
              {pairs.map((p) => (
                <li key={p._id} className="py-3 flex justify-between items-center">
                  <span className="font-semibold text-blue-700 text-lg">{p.interviewer?.name || p.interviewer?.email} ➜ {p.interviewee?.name || p.interviewee?.email}</span>
                  <button className="bg-green-600 text-white px-4 py-2 rounded-xl font-bold shadow-lg hover:bg-green-700 transition text-lg" onClick={() => setSelectedPair(p)}>Propose Slots</button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {selectedPair && (
          <div className="mb-8">
            <h3 className="font-semibold mb-4 text-lg text-gray-700">Propose & Confirm Time Slot</h3>
            <div className="mb-2 text-blue-700 font-semibold">Pair: {selectedPair.interviewer?.email} & {selectedPair.interviewee?.email}</div>
            <div className="space-y-2 mb-4">
              {slots.map((s, idx) => (
                <input key={idx} type="datetime-local" value={s} onChange={(e) => setSlots((prev) => prev.map((v, i) => i===idx?e.target.value:v))} className="w-full border p-3 rounded-xl" />
              ))}
              <button className="text-blue-600 text-sm" onClick={() => setSlots((prev) => [...prev, ""]) }>+ Add slot</button>
            </div>
            <div className="flex gap-2">
              <button onClick={handlePropose} className="bg-blue-600 text-white px-4 py-2 rounded-xl">Propose Slots</button>
              <button onClick={() => handleConfirm(slots[0], prompt('Meeting link (optional):') || '')} className="bg-purple-600 text-white px-4 py-2 rounded-xl">Confirm First Slot</button>
            </div>
            {message && <div className="mt-3 text-green-700">{message}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
