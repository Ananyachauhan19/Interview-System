import { useState, useEffect } from "react";
import { api } from "../utils/api";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, AlertCircle, Calendar, Link as LinkIcon, MessageSquare } from "lucide-react";

export default function SessionAndFeedback() {
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState("");
  const [pairs, setPairs] = useState([]);
  const [activePair, setActivePair] = useState(null);
  const [marks, setMarks] = useState("");
  const [comments, setComments] = useState("");
  const [notification, setNotification] = useState("");

  useEffect(() => {
    api.listEvents().then(setEvents).catch(console.error);
  }, []);

  useEffect(() => {
    if (eventId) api.listPairs(eventId).then(setPairs).catch(console.error);
  }, [eventId]);

  const submit = async (e) => {
    e.preventDefault();
    if (!activePair) return;
    try {
      await api.submitFeedback(activePair._id, Number(marks), comments);
      setNotification("Feedback submitted successfully");
      setActivePair(null);
      setMarks("");
      setComments("");
    } catch (err) {
      setNotification(err.message);
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
            Session & Feedback
          </motion.h2>
          <AnimatePresence>
            {notification && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className={`flex items-center justify-center text-sm text-center p-3 rounded-xl mb-6 ${
                  notification.toLowerCase().includes("success")
                    ? "bg-green-50 text-green-600 border border-green-100"
                    : "bg-red-50 text-red-600 border border-red-100"
                }`}
              >
                {notification.toLowerCase().includes("success") ? (
                  <CheckCircle className="w-5 h-5 mr-2" />
                ) : (
                  <AlertCircle className="w-5 h-5 mr-2" />
                )}
                {notification}
              </motion.div>
            )}
          </AnimatePresence>
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Scheduled Sessions</h3>
            {pairs.filter((p) => p.scheduledAt).length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-gray-600 text-sm text-center"
              >
                No scheduled sessions found.
              </motion.div>
            ) : (
              <div className="space-y-4">
                {pairs
                  .filter((p) => p.scheduledAt)
                  .map((p, idx) => (
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
                            <Calendar className="w-4 h-4 text-blue-500" />
                            <span className="font-semibold text-gray-800">
                              {p.interviewer?.email} ➜ {p.interviewee?.email}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            Time: {new Date(p.scheduledAt).toLocaleString()}
                          </div>
                          {p.meetingLink ? (
                            <div className="mt-2 flex items-center gap-2">
                              <LinkIcon className="w-4 h-4 text-blue-500" />
                              <a
                                href={p.meetingLink}
                                className="text-blue-600 hover:text-blue-800 underline text-sm"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Join Meeting
                              </a>
                            </div>
                          ) : (
                            <div className="mt-2 text-sm text-gray-600">
                              Meeting link will appear 1 hour before the scheduled time.
                            </div>
                          )}
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setActivePair(p)}
                          className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-4 py-2 rounded-xl font-semibold text-sm hover:from-purple-600 hover:to-indigo-600 transition-all duration-200 shadow-md"
                        >
                          <MessageSquare className="w-4 h-4 mr-2 inline" />
                          Fill Feedback
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
              </div>
            )}
          </motion.div>
          {activePair && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-8 bg-gray-50 p-6 rounded-xl border border-gray-200"
            >
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Session Feedback</h3>
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Marks out of 100
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={marks}
                    onChange={(e) => setMarks(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-700"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Comments
                  </label>
                  <textarea
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-700"
                    rows="4"
                    required
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: "0 10px 20px -5px rgba(59, 130, 246, 0.3)" }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white p-3 rounded-xl font-semibold text-sm hover:from-blue-600 hover:to-purple-600 transition-all duration-200 shadow-md"
                >
                  Submit Feedback
                </motion.button>
              </form>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}