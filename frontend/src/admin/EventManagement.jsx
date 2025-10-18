/* eslint-disable no-unused-vars */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../utils/api";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, AlertCircle, ToggleRight, ToggleLeft, Calendar, FileText, Upload } from "lucide-react";
import { toast } from 'react-toastify';

export default function EventManagement() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [template, setTemplate] = useState(null);
  const [msg, setMsg] = useState("");
  const [specialMode, setSpecialMode] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const navigate = useNavigate();

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStartDate("");
    setEndDate("");
    setTemplate(null);
    setCsvFile(null);
  };

  function localDateTimeNow() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const min = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  }

  const [nowLocal, setNowLocal] = useState(localDateTimeNow());
  useEffect(() => {
    const t = setInterval(() => setNowLocal(localDateTimeNow()), 15000);
    return () => clearInterval(t);
  }, []);

  // Auto-dismiss toast after 3 seconds
  // react-toastify will auto-dismiss; no local timer needed

  function parseLocalDateTime(value) {
    // value expected in 'YYYY-MM-DDTHH:MM' format (datetime-local)
    if (!value) return NaN;
    const [datePart, timePart] = String(value).split('T');
    if (!datePart || !timePart) return NaN;
    const [y, m, d] = datePart.split('-').map(Number);
    const [hh, mm] = timePart.split(':').map(Number);
    if ([y, m, d, hh, mm].some(v => Number.isNaN(v))) return NaN;
    return new Date(y, m - 1, d, hh, mm).getTime();
  }

  function toLocalInputValue(val) {
    if (!val) return '';
    // If already in YYYY-MM-DDTHH:MM return as-is
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(val)) return val;
    // Try parsing ISO or other formats into a Date, then format as local YYYY-MM-DDTHH:MM
    const d = new Date(val);
    if (isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const min = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  }

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    // client-side validation: ensure start >= now and end >= start
    const nowIsoLocal = new Date().toISOString().slice(0,16);
    if (startDate) {
      const s = parseLocalDateTime(startDate);
      if (isNaN(s)) { setMsg('Invalid start date'); return; }
      if (s < Date.now()) { setMsg('Start date cannot be in the past'); return; }
    }
    if (startDate && endDate) {
      const s = parseLocalDateTime(startDate);
      const en = parseLocalDateTime(endDate);
      if (isNaN(s) || isNaN(en)) { setMsg('Invalid start or end date'); return; }
      if (en < s) { setMsg('End date must be the same or after start date'); return; }
    }
    let toastId;
    try {
      let ev;
      const payloadStart = startDate ? new Date(parseLocalDateTime(startDate)).toISOString() : undefined;
      const payloadEnd = endDate ? new Date(parseLocalDateTime(endDate)).toISOString() : undefined;

      // Show an immediate loading toast so user sees feedback instantly
      toastId = toast.loading('Creating event...');

      if (specialMode) {
        const res = await api.createSpecialEvent({ name: title, description, startDate: payloadStart, endDate: payloadEnd, template, csv: csvFile });
        const eventName = res.name || title;
        // Backend returns { eventId } for special events — use it if present
        const newId = res._id || res.eventId;
        toast.update(toastId, { render: `Event "${eventName}" created successfully!`, type: 'success', isLoading: false, autoClose: 3000 });
        resetForm();
        if (newId) navigate(`/admin/event/${newId}`, { state: { eventCreated: true } });
      } else {
        ev = await api.createEvent({ name: title, description, startDate: payloadStart, endDate: payloadEnd, template });
        const eventName = ev.name || title;
        toast.update(toastId, { render: `Event "${eventName}" created successfully!`, type: 'success', isLoading: false, autoClose: 3000 });
        resetForm();
        if (ev && ev._id) navigate(`/admin/event/${ev._id}`, { state: { eventCreated: true } });
      }
    } catch (err) {
      // Update the loading toast if present; otherwise show error toast
      if (toastId) {
        toast.update(toastId, { render: err?.message || 'Failed to create event', type: 'error', isLoading: false, autoClose: 5000 });
      } else {
        toast.error(err?.message || 'Failed to create event');
      }
      setMsg(err.message || 'Failed to create event');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pt-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex-1 w-full max-w-2xl mx-auto px-4 py-4"
      >
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          {/* Header Section */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-indigo-800 rounded-lg flex items-center justify-center">
              <Calendar className="text-white w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-800">Event Management</h2>
              <p className="text-slate-600 text-sm">Create interview practice events</p>
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="flex justify-end mb-4">
            <button
              type="button"
              onClick={() => { setSpecialMode(!specialMode); setMsg(""); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                specialMode
                  ? 'bg-indigo-800 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {specialMode ? <ToggleRight className="w-3 h-3" /> : <ToggleLeft className="w-3 h-3" />}
              {specialMode ? 'Special Event' : 'Normal Event'}
            </button>
          </div>

          <form onSubmit={handleCreateEvent}>
            <div className="space-y-3">
              {/* Event Title */}
              <div>
                <label className="block text-sm font-medium text-slate-800 mb-1">Event Title</label>
                <input
                  type="text"
                  placeholder="Enter event title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-white border border-slate-300 p-2.5 rounded-lg focus:ring-1 focus:ring-sky-500 focus:border-sky-500 text-slate-700 text-sm"
                  required
                />
              </div>

              {/* Event Description */}
              <div>
                <label className="block text-sm font-medium text-slate-800 mb-1">Event Description</label>
                <textarea
                  placeholder="Describe the event purpose and format..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-white border border-slate-300 p-2.5 rounded-lg focus:ring-1 focus:ring-sky-500 focus:border-sky-500 text-slate-700 text-sm"
                  rows="3"
                  required
                />
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-800 mb-1">Start Date & Time</label>
                  <input
                    type="datetime-local"
                    value={toLocalInputValue(startDate)}
                    onChange={(e) => {
                      const v = e.target.value;
                      const parsed = parseLocalDateTime(v);
                      if (!isNaN(parsed) && parsed < Date.now()) {
                        setMsg('Start cannot be before now; clamped to current time');
                        setStartDate(localDateTimeNow());
                        return;
                      }
                      setStartDate(v);
                    }}
                    min={nowLocal}
                    max={toLocalInputValue(endDate) || undefined}
                    className="w-full bg-white border border-slate-300 p-2.5 rounded-lg focus:ring-1 focus:ring-sky-500 focus:border-sky-500 text-slate-700 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-800 mb-1">End Date & Time</label>
                  <input
                    type="datetime-local"
                    value={toLocalInputValue(endDate)}
                    onChange={(e) => {
                      const v = e.target.value;
                      const parsed = parseLocalDateTime(v);
                      const startParsed = parseLocalDateTime(startDate);
                      if (!isNaN(parsed) && !isNaN(startParsed) && parsed < startParsed) {
                        setMsg('End cannot be before start; clamped to start time');
                        setEndDate(toLocalInputValue(startDate));
                        return;
                      }
                      setEndDate(v);
                    }}
                    min={toLocalInputValue(startDate) || nowLocal}
                    className="w-full bg-white border border-slate-300 p-2.5 rounded-lg focus:ring-1 focus:ring-sky-500 focus:border-sky-500 text-slate-700 text-sm"
                    required
                  />
                </div>
              </div>

              {/* Template Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-800 mb-1">Interview Template (Optional)</label>
                <label className="flex items-center justify-center w-full p-3 bg-white rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer">
                  <Upload className="w-4 h-4 text-sky-500 mr-2" />
                  <span className="text-slate-700 text-sm font-medium">Upload Template File</span>
                  <input
                    type="file"
                    onChange={(e) => setTemplate(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
                {template && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 mt-2 p-2 bg-sky-50 rounded border border-sky-200"
                  >
                    <FileText className="w-4 h-4 text-sky-600" />
                    <span className="text-sky-800 text-sm font-medium">{template.name}</span>
                  </motion.div>
                )}
                <p className="text-xs text-slate-500 mt-1">
                  Upload a template file for interview questions or guidelines (optional)
                </p>
              </div>

              {/* Special Mode CSV Upload */}
              {specialMode && (
                <div className="bg-sky-50 border border-sky-200 rounded-lg p-3">
                  <label className="block text-sm font-medium text-slate-800 mb-2">
                    <FileText className="w-4 h-4 inline mr-1 text-sky-600" />
                    Allowed Participants CSV
                  </label>
                  <label className="flex items-center justify-center w-full p-3 bg-white rounded border border-sky-300 hover:bg-sky-50 cursor-pointer border-dashed">
                    <div className="text-center">
                      <FileText className="w-6 h-6 text-sky-500 mx-auto mb-1" />
                      <span className="text-slate-700 text-sm font-medium">Upload CSV File</span>
                    </div>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                      className="hidden"
                      required={specialMode}
                    />
                  </label>
                  {csvFile && (
                    <div className="flex items-center gap-2 mt-2 p-2 bg-white rounded border border-sky-200">
                      <FileText className="w-4 h-4 text-sky-600" />
                      <span className="text-sky-800 text-sm">{csvFile.name}</span>
                    </div>
                  )}
                  <p className="text-xs text-slate-600 mt-2">
                    CSV headers: email or studentId. Only listed users can join.
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className={`w-full p-3 rounded-lg font-medium text-white text-sm transition-colors ${
                  specialMode
                    ? 'bg-indigo-800 hover:bg-indigo-900'
                    : 'bg-sky-500 hover:bg-sky-600'
                }`}
              >
                {specialMode ? 'Create Special Event' : 'Create Event'}
              </button>

              {/* Help Text */}
              <p className="text-xs text-slate-500 text-center">
                {specialMode
                  ? 'Pairs are auto-generated among invited participants'
                  : 'Pairs are auto-generated among all students'}
              </p>
            </div>
          </form>

          {/* Status Message */}
          <AnimatePresence>
            {msg && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className={`flex items-center justify-center text-sm p-3 rounded-lg mt-3 ${
                  msg.toLowerCase().includes('success') || msg.toLowerCase().includes('created')
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {msg.toLowerCase().includes('success') || msg.toLowerCase().includes('created') ? (
                  <CheckCircle className="w-4 h-4 mr-2" />
                ) : (
                  <AlertCircle className="w-4 h-4 mr-2" />
                )}
                {msg}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* react-toastify handles toasts globally */}
    </div>
  );
}