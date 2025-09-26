import { useEffect, useMemo, useState } from "react";
import { api } from "../utils/api";

export default function PairingAndScheduling() {
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState("");
  const [pairs, setPairs] = useState([]);
  const [selectedPair, setSelectedPair] = useState(null);
  const [slots, setSlots] = useState([""]);
  const [message, setMessage] = useState("");
  const [me, setMe] = useState(null);
  const [currentProposals, setCurrentProposals] = useState({ mine: [], partner: [], common: null });
  const [selectedToAccept, setSelectedToAccept] = useState("");

  useEffect(() => {
    // Load events and current user (role)
    api.listEvents().then(setEvents).catch(console.error);
    // Best-effort: decode token payload to get user id and role if available
    try {
      const t = localStorage.getItem('token');
      if (t) {
        const payload = JSON.parse(atob(t.split('.')[1]));
        setMe({ id: payload.id, role: payload.role, email: payload.email, name: payload.name });
      }
    } catch {
      // ignore decode errors
    }
  }, []);
  useEffect(() => { if (eventId) api.listPairs(eventId).then(setPairs).catch(console.error); }, [eventId]);

  const isInterviewer = useMemo(() => {
    if (!selectedPair || !me) return false;
    return selectedPair.interviewer?._id === me.id || selectedPair.interviewer?._id === me?.sub || selectedPair.interviewer?.email === me?.email;
  }, [selectedPair, me]);
  const isLocked = selectedPair?.status === 'scheduled';

  useEffect(() => {
    // When a pair is selected, fetch current proposals (read-only)
    const fetch = async () => {
      setCurrentProposals({ mine: [], partner: [], common: null });
      setSelectedToAccept("");
      if (!selectedPair) return;
      try {
        const res = await api.proposeSlots(selectedPair._id, []);
        setCurrentProposals(res);
      } catch {
        // ignore
      }
    };
    fetch();
  }, [selectedPair]);

  const handlePropose = async () => {
    setMessage("");
    const isoSlots = slots.filter(Boolean);
    if (!selectedPair || isoSlots.length === 0) return;
    try {
      const res = await api.proposeSlots(selectedPair._id, isoSlots);
      if (res.common) setMessage(`Common slot found: ${res.common}`);
      else setMessage("Slots proposed. Waiting for partner.");
      // refresh proposals
      const ro = await api.proposeSlots(selectedPair._id, []);
      setCurrentProposals(ro);
    } catch (err) { setMessage(err.message); }
  };

  const handleConfirm = async (dt, link) => {
    if (!selectedPair) return;
    try {
      const iso = dt && dt.includes('T') ? new Date(dt).toISOString() : dt;
      await api.confirmSlot(selectedPair._id, iso, link);
      setMessage("Scheduled!");
      // refresh pairs to reflect scheduledAt
      const updated = await api.listPairs(eventId);
      setPairs(updated);
    } catch (err) { setMessage(err.message); }
  };

  const handleReject = async () => {
    if (!selectedPair) return;
    try {
      await api.rejectSlots(selectedPair._id);
      setMessage('Rejected slots. Waiting for new proposal from interviewer.');
      const updated = await api.listPairs(eventId);
      setPairs(updated);
      setCurrentProposals({ mine: [], partner: [], common: null });
    } catch (e) {
      setMessage(e.message);
    }
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
                  <div className="flex flex-col">
                    <span className="font-semibold text-blue-700 text-lg">{p.interviewer?.name || p.interviewer?.email} ➜ {p.interviewee?.name || p.interviewee?.email}</span>
                    <span className="text-xs text-gray-500">Status: {p.status || 'pending'}{p.rejectionCount ? ` | Rejections: ${p.rejectionCount}` : ''}</span>
                  </div>
                  <button className="bg-green-600 text-white px-4 py-2 rounded-xl font-bold shadow-lg hover:bg-green-700 transition text-lg" onClick={() => setSelectedPair(p)}>
                    {isInterviewer ? 'Manage Slots' : 'View / Respond'}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {selectedPair && (
          <div className="mb-8">
            <h3 className="font-semibold mb-2 text-lg text-gray-700">Propose & Confirm Time Slot</h3>
            <p className="text-sm text-gray-600 mb-4">Interviewer proposes times within the event window. Interviewee either accepts or rejects (triggering a re-proposal). Meeting link is auto-generated within 1 hour of start. Once scheduled, no further changes are allowed.</p>
            {isLocked && (
              <div className="p-3 mb-4 bg-green-50 text-green-700 rounded-lg text-sm font-medium">This interview is scheduled and cannot be modified.</div>
            )}
            <div className="mb-2 text-blue-700 font-semibold">Pair: {selectedPair.interviewer?.email} & {selectedPair.interviewee?.email}</div>
            <div className="space-y-2 mb-4">
              {slots.map((s, idx) => (
                <input key={idx} type="datetime-local" value={s} onChange={(e) => setSlots((prev) => prev.map((v, i) => i===idx?e.target.value:v))} className="w-full border p-3 rounded-xl" />
              ))}
              <button className="text-blue-600 text-sm" onClick={() => setSlots((prev) => [...prev, ""]) }>+ Add slot</button>
            </div>
            <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Interviewer proposed</h4>
                <ul className="text-sm text-gray-700 list-disc ml-5">
                  {currentProposals.partner && currentProposals.partner.length > 0 ? (
                    currentProposals.partner.map((s, i) => (
                      <li key={i} className="flex items-center gap-2">
                        {!isInterviewer && (
                          <input type="radio" name="acceptSlot" value={s} onChange={() => setSelectedToAccept(s)} />
                        )}
                        <span>{new Date(s).toLocaleString()}</span>
                      </li>
                    ))
                  ) : <li>No slots yet.</li>}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Your proposed</h4>
                <ul className="text-sm text-gray-700 list-disc ml-5">
                  {currentProposals.mine && currentProposals.mine.length > 0 ? (
                    currentProposals.mine.map((s, i) => (
                      <li key={i}>{new Date(s).toLocaleString()}</li>
                    ))
                  ) : <li>No slots yet.</li>}
                </ul>
              </div>
            </div>
            {currentProposals.common && (
              <div className="p-3 bg-green-50 text-green-700 rounded-lg mb-2">Common slot: {new Date(currentProposals.common).toLocaleString()}</div>
            )}
            <div className="flex gap-2 items-center">
              <button disabled={isLocked} onClick={handlePropose} className="bg-blue-600 text-white px-4 py-2 rounded-xl disabled:opacity-50" title={isInterviewer ? '' : 'Interviewer should propose first'}>
                {isInterviewer ? 'Propose Slots' : 'Request Change / Send Alternatives'}
              </button>
              {isInterviewer ? (
                <span className="text-sm text-gray-600">{isLocked ? 'Scheduled.' : 'Waiting for interviewee to accept or reject.'}</span>
              ) : (
                <div className="flex gap-2">
                  <button disabled={!selectedToAccept || isLocked} onClick={() => handleConfirm(selectedToAccept, '')} className="bg-purple-600 text-white px-4 py-2 rounded-xl disabled:opacity-50">
                    Accept Selected Slot
                  </button>
                  <button disabled={isLocked} onClick={handleReject} className="bg-red-600 text-white px-4 py-2 rounded-xl disabled:opacity-50">Reject</button>
                </div>
              )}
            </div>
            {message && <div className="mt-3 text-green-700">{message}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
