import { useEffect, useMemo, useState } from "react";
import { api } from "../utils/api";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, AlertCircle, Clock, Users, PlusCircle } from "lucide-react";

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
    api.listEvents().then(setEvents).catch(console.error);
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

  useEffect(() => {
    if (eventId) api.listPairs(eventId).then(setPairs).catch(console.error);
  }, [eventId]);

  const isInterviewer = useMemo(() => {
    if (!selectedPair || !me) return false;
    return (
      selectedPair.interviewer?._id === me.id ||
      selectedPair.interviewer?._id === me?.sub ||
      selectedPair.interviewer?.email === me?.email
    );
  }, [selectedPair, me]);

  const isLocked = selectedPair?.status === 'scheduled';

  useEffect(() => {
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
    if (!selectedPair || isoSlots.length === 0) {
      setMessage("Please select a pair and add at least one slot.");
      return;
    }
    try {
      const res = await api.proposeSlots(selectedPair._id, isoSlots);
      if (res.common) setMessage(`Common slot found: ${new Date(res.common).toLocaleString()}`);
      else setMessage("Slots proposed. Waiting for partner.");
      const ro = await api.proposeSlots(selectedPair._id, []);
      setCurrentProposals(ro);
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleConfirm = async (dt, link) => {
    if (!selectedPair) return;
    try {
      const iso = dt && dt.includes('T') ? new Date(dt).toISOString() : dt;
      await api.confirmSlot(selectedPair._id, iso, link);
      setMessage("Scheduled successfully!");
      const updated = await api.listPairs(eventId);
      setPairs(updated);
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleReject = async () => {
    if (!selectedPair) return;
    try {
      await api.rejectSlots(selectedPair._id);
      setMessage("Rejected slots. Waiting for new proposal from interviewer.");
      const updated = await api.listPairs(eventId);
      setPairs(updated);
      setCurrentProposals({ mine: [], partner: [], common: null });
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pt-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex-1 w-full mx-auto px-4 sm:px-6 md:px-8 py-6"
      >
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 md:p-8">
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-3xl font-bold text-gray-800 mb-4 text-center tracking-tight"
          >
            Pairing & Scheduling
          </motion.h2>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-6"
          >
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              Select Event
            </label>
            <select
              className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-700"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
            >
              <option value="">-- Choose Event --</option>
              {events.map((e) => (
                <option key={e._id} value={e._id}>
                  {e.name}
                </option>
              ))}
            </select>
          </motion.div>
          {pairs.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Student Pairs</h3>
              <div className="space-y-4">
                {pairs.map((p, idx) => (
                  <motion.div
                    key={p._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + idx * 0.1 }}
                    className="p-4 rounded-xl bg-white shadow-sm border border-gray-100 hover:bg-gray-50 transition-all duration-200"
                  >
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-blue-500" />
                          <span className="font-semibold text-gray-800">
                            {p.interviewer?.name || p.interviewer?.email} ➜ {p.interviewee?.name || p.interviewee?.email}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          Status: {p.status || 'Pending'}{p.rejectionCount ? ` | Rejections: ${p.rejectionCount}` : ''}
                        </div>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05, boxShadow: "0 10px 20px -5px rgba(59, 130, 246, 0.3)" }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedPair(p)}
                        className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-xl font-semibold text-sm hover:from-green-600 hover:to-emerald-600 transition-all duration-200 shadow-md"
                      >
                        {isInterviewer ? 'Manage Slots' : 'View / Respond'}
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
          {selectedPair && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-8"
            >
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Propose & Confirm Time Slot</h3>
              <p className="text-sm text-gray-600 mb-4">
                Interviewer proposes times within the event window. Interviewee either accepts or rejects (triggering a re-proposal). Meeting link is auto-generated within 1 hour of start. Once scheduled, no further changes are allowed.
              </p>
              {isLocked && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-3 mb-4 bg-green-50 text-green-600 rounded-xl border border-green-100 text-sm font-medium flex items-center"
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  This interview is scheduled and cannot be modified.
                </motion.div>
              )}
              <div className="text-sm font-semibold text-gray-800 mb-4">
                Pair: {selectedPair.interviewer?.email} & {selectedPair.interviewee?.email}
              </div>
              <div className="space-y-4 mb-6">
                {slots.map((s, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + idx * 0.1 }}
                  >
                    <input
                      type="datetime-local"
                      value={s}
                      onChange={(e) =>
                        setSlots((prev) => prev.map((v, i) => (i === idx ? e.target.value : v)))
                      }
                      className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-700"
                      disabled={isLocked}
                    />
                  </motion.div>
                ))}
                {!isLocked && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSlots((prev) => [...prev, ""])}
                    className="flex items-center gap-2 text-blue-600 text-sm hover:text-blue-800"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Add Slot
                  </motion.button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Interviewer Proposed</h4>
                  <ul className="text-sm text-gray-600 list-disc ml-5 space-y-2">
                    {currentProposals.partner && currentProposals.partner.length > 0 ? (
                      currentProposals.partner.map((s, i) => (
                        <li key={i} className="flex items-center gap-2">
                          {!isInterviewer && !isLocked && (
                            <input
                              type="radio"
                              name="acceptSlot"
                              value={s}
                              onChange={() => setSelectedToAccept(s)}
                              className="text-purple-500 focus:ring-purple-500"
                            />
                          )}
                          <span>{new Date(s).toLocaleString()}</span>
                        </li>
                      ))
                    ) : (
                      <li>No slots proposed yet.</li>
                    )}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Your Proposed</h4>
                  <ul className="text-sm text-gray-600 list-disc ml-5 space-y-2">
                    {currentProposals.mine && currentProposals.mine.length > 0 ? (
                      currentProposals.mine.map((s, i) => (
                        <li key={i}>{new Date(s).toLocaleString()}</li>
                      ))
                    ) : (
                      <li>No slots proposed yet.</li>
                    )}
                  </ul>
                </div>
              </div>
              {currentProposals.common && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-3 bg-green-50 text-green-600 rounded-xl border border-green-100 mb-4 text-sm flex items-center"
                >
                  <Clock className="w-5 h-5 mr-2" />
                  Common slot: {new Date(currentProposals.common).toLocaleString()}
                </motion.div>
              )}
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: "0 10px 20px -5px rgba(59, 130, 246, 0.3)" }}
                  whileTap={{ scale: 0.95 }}
                  disabled={isLocked}
                  onClick={handlePropose}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-xl font-semibold text-sm hover:from-blue-600 hover:to-purple-600 transition-all duration-200 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  title={isInterviewer ? '' : 'Interviewer should propose first'}
                >
                  {isInterviewer ? 'Propose Slots' : 'Request Change / Send Alternatives'}
                </motion.button>
                {!isInterviewer && (
                  <div className="flex gap-3">
                    <motion.button
                      whileHover={{ scale: 1.05, boxShadow: "0 10px 20px -5px rgba(124, 58, 237, 0.3)" }}
                      whileTap={{ scale: 0.95 }}
                      disabled={!selectedToAccept || isLocked}
                      onClick={() => handleConfirm(selectedToAccept, '')}
                      className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-4 py-2 rounded-xl font-semibold text-sm hover:from-purple-600 hover:to-indigo-600 transition-all duration-200 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Accept Selected Slot
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05, boxShadow: "0 10px 20px -5px rgba(239, 68, 68, 0.3)" }}
                      whileTap={{ scale: 0.95 }}
                      disabled={isLocked}
                      onClick={handleReject}
                      className="bg-gradient-to-r from-red-500 to-rose-500 text-white px-4 py-2 rounded-xl font-semibold text-sm hover:from-red-600 hover:to-rose-600 transition-all duration-200 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Reject
                    </motion.button>
                  </div>
                )}
                {isInterviewer && (
                  <span className="text-sm text-gray-600">
                    {isLocked ? 'Scheduled.' : 'Waiting for interviewee to accept or reject.'}
                  </span>
                )}
              </div>
              <AnimatePresence>
                {message && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className={`flex items-center text-sm p-3 rounded-xl mt-4 ${
                      message.toLowerCase().includes('success')
                        ? 'bg-green-50 text-green-600 border border-green-100'
                        : 'bg-red-50 text-red-600 border border-red-100'
                    }`}
                  >
                    {message.toLowerCase().includes('success') ? (
                      <CheckCircle className="w-5 h-5 mr-2" />
                    ) : (
                      <AlertCircle className="w-5 h-5 mr-2" />
                    )}
                    {message}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}