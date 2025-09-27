import { useEffect, useState } from "react";
import { api } from "../utils/api";
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from "framer-motion";
import { Upload, CheckCircle, AlertCircle, Calendar, ToggleRight, ToggleLeft } from "lucide-react";

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
    setTitle("");
    setDescription("");
    setStartDate("");
    setEndDate("");
    setTemplate(null);
    setCsvFile(null);
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
        setMsg("Event created successfully");
      }
      resetForm();
    } catch (err) {
      setMsg(err.message);
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
            Event Management
          </motion.h2>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="flex justify-end mb-6"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => { setSpecialMode(!specialMode); setMsg(""); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all duration-200 ${
                specialMode
                  ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white border border-purple-200'
                  : 'bg-gray-50 text-purple-600 border border-purple-200 hover:bg-gray-100'
              }`}
            >
              {specialMode ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
              {specialMode ? 'Special Event Mode ON' : 'Normal Event Mode'}
            </motion.button>
          </motion.div>
          <form onSubmit={handleCreateEvent} className="mb-8">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-4"
            >
              <input
                type="text"
                placeholder="Event Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-base text-gray-700"
                required
              />
              <textarea
                placeholder="Event Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-base text-gray-700"
                rows="4"
                required
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-base text-gray-700"
                />
                <input
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-base text-gray-700"
                />
              </div>
              <label className="flex items-center justify-center w-full p-4 bg-gray-50 rounded-xl border border-gray-200 hover:bg-gray-100 transition-all duration-200 cursor-pointer">
                <Upload className="w-5 h-5 text-blue-500 mr-2" />
                <span className="text-gray-700 font-medium">Upload Template</span>
                <input
                  type="file"
                  onChange={(e) => setTemplate(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
              {template && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm text-gray-500 text-center"
                >
                  Selected: {template.name}
                </motion.p>
              )}
              {specialMode && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <label className="block text-sm font-semibold text-gray-800 mb-1">
                    Allowed Participants CSV
                  </label>
                  <label className="flex items-center justify-center w-full p-4 bg-gray-50 rounded-xl border border-gray-200 hover:bg-gray-100 transition-all duration-200 cursor-pointer">
                    <Upload className="w-5 h-5 text-purple-500 mr-2" />
                    <span className="text-gray-700 font-medium">Upload CSV</span>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                      className="hidden"
                      required={specialMode}
                    />
                  </label>
                  {csvFile && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-sm text-gray-500 mt-2 text-center"
                    >
                      Selected: {csvFile.name}
                    </motion.p>
                  )}
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    CSV headers: email or studentId (case-insensitive). Only listed users will see & join this event.
                  </p>
                </motion.div>
              )}
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: "0 10px 20px -5px rgba(59, 130, 246, 0.3)" }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                className={`w-full p-4 rounded-xl font-semibold text-white text-base shadow-md transition-all duration-200 ${
                  specialMode
                    ? 'bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600'
                    : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600'
                }`}
              >
                {specialMode ? 'Create Special Event' : 'Create Event'}
              </motion.button>
            </motion.div>
          </form>
          <AnimatePresence>
            {msg && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className={`flex items-center justify-center text-sm text-center p-4 rounded-xl mb-6 ${
                  msg.toLowerCase().includes('success')
                    ? 'bg-green-50 text-green-600 border border-green-100'
                    : 'bg-red-50 text-red-600 border border-red-100'
                }`}
              >
                {msg.toLowerCase().includes('success') ? (
                  <CheckCircle className="w-5 h-5 mr-2" />
                ) : (
                  <AlertCircle className="w-5 h-5 mr-2" />
                )}
                {msg}
              </motion.div>
            )}
          </AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Existing Events</h3>
            {events.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-gray-500 text-sm text-center"
              >
                No events found
              </motion.div>
            ) : (
              <div className="space-y-4">
                {events.map((e, idx) => (
                  <motion.div
                    key={e._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + idx * 0.1 }}
                    className="p-4 rounded-xl bg-white shadow-sm border border-gray-100 hover:bg-gray-50 transition-all duration-200"
                  >
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-blue-500" />
                          <span className="font-semibold text-gray-800">{e.name}</span>
                          {e.isSpecial && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                              Special
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {new Date(e.startDate).toLocaleString()} → {new Date(e.endDate).toLocaleString()}
                        </div>
                        {e.templateUrl && (
                          <a
                            href={e.templateUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-800 underline"
                          >
                            View template{e.templateName ? `: ${e.templateName}` : ''}
                          </a>
                        )}
                      </div>
                      <Link
                        to={`/admin/event/${e._id}`}
                        className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-xl font-semibold text-sm hover:from-blue-600 hover:to-purple-600 transition-all duration-200 shadow-md"
                      >
                        Details
                      </Link>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}