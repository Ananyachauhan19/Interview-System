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
    // Update minimum time more frequently (every 30 seconds) to keep restrictions current
    const t = setInterval(() => setNowLocal(localDateTimeNow()), 30000);
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
    setMsg(""); // Clear previous messages
    
    // client-side validation: ensure start >= now and end >= start
    if (startDate) {
      const s = parseLocalDateTime(startDate);
      if (isNaN(s)) { 
        setMsg('Please select a valid start date and time'); 
        return; 
      }
      if (s < Date.now()) { 
        setMsg('Start date and time cannot be in the past. Please select a future date and time.'); 
        return; 
      }
    }
    if (startDate && endDate) {
      const s = parseLocalDateTime(startDate);
      const en = parseLocalDateTime(endDate);
      if (isNaN(s) || isNaN(en)) { 
        setMsg('Please select valid start and end dates'); 
        return; 
      }
      if (en < s) { 
        setMsg('End date must be after or equal to the start date'); 
        return; 
      }
    }
    
    let toastId;
    try {
      let ev;
      const payloadStart = startDate ? new Date(parseLocalDateTime(startDate)).toISOString() : undefined;
      const payloadEnd = endDate ? new Date(parseLocalDateTime(endDate)).toISOString() : undefined;

      // Show an immediate loading toast so user sees feedback instantly
      toastId = toast.loading('Creating your event...');

      if (specialMode) {
        const res = await api.createSpecialEvent({ name: title, description, startDate: payloadStart, endDate: payloadEnd, template, csv: csvFile });
        const eventName = res.name || title;
        const newId = res._id || res.eventId;
        
        // Update toast to success and navigate immediately
        toast.update(toastId, { render: `Event "${eventName}" created successfully!`, type: 'success', isLoading: false, autoClose: 3000 });
        setMsg(''); // Clear any error messages
        resetForm();
        
        // Navigate immediately
        if (newId) navigate(`/admin/event/${newId}`, { state: { eventCreated: true } });
        
        // Show email notification after a delay (emails are being sent in background)
        setTimeout(() => {
          toast.info('Invitation emails are being sent to participants...', { autoClose: 5000 });
        }, 2000);
        
      } else {
        ev = await api.createEvent({ name: title, description, startDate: payloadStart, endDate: payloadEnd, template });
        const eventName = ev.name || title;
        
        // Update toast to success and navigate immediately
        toast.update(toastId, { render: `Event "${eventName}" created successfully!`, type: 'success', isLoading: false, autoClose: 3000 });
        setMsg(''); // Clear any error messages
        resetForm();
        
        // Navigate immediately
        if (ev && ev._id) navigate(`/admin/event/${ev._id}`, { state: { eventCreated: true } });
        
        // Show email notification after a delay (emails are being sent in background)
        setTimeout(() => {
          toast.info('Notification emails are being sent to all students...', { autoClose: 5000 });
        }, 2000);
      }
    } catch (err) {
      const errorMessage = err?.message || 'Failed to create event';
      let userFriendlyError = errorMessage;
      
      // Make error messages user-friendly
      if (errorMessage.includes('past')) {
        userFriendlyError = 'The selected date and time cannot be in the past. Please choose a future date.';
      } else if (errorMessage.includes('end') && errorMessage.includes('start')) {
        userFriendlyError = 'The end date must be after the start date. Please adjust your dates.';
      } else if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
        userFriendlyError = 'Please check that all fields are filled correctly';
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        userFriendlyError = 'Unable to connect to the server. Please check your internet connection and try again.';
      } else if (errorMessage.includes('CSV') || errorMessage.includes('csv')) {
        userFriendlyError = 'There was an issue with the participant CSV file. Please check the format and try again.';
      }
      
      // Update the loading toast if present; otherwise show error toast
      if (toastId) {
        toast.update(toastId, { render: userFriendlyError, type: 'error', isLoading: false, autoClose: 5000 });
      } else {
        toast.error(userFriendlyError);
      }
      setMsg(userFriendlyError);
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
                    onBlur={(e) => {
                      // Validate on blur (when user finishes selecting)
                      const v = e.target.value;
                      if (!v) return;
                      
                      const selectedTime = parseLocalDateTime(v);
                      const currentTime = Date.now();
                      
                      if (!isNaN(selectedTime) && selectedTime < currentTime) {
                        setMsg('Start date and time cannot be in the past. Please select a future time.');
                        setStartDate(''); // Clear invalid selection
                        e.target.value = ''; // Clear input display
                      }
                    }}
                    onChange={(e) => {
                      const v = e.target.value;
                      
                      // Only update if valid value provided
                      if (!v) {
                        setStartDate('');
                        setMsg("");
                        return;
                      }
                      
                      const selectedTime = parseLocalDateTime(v);
                      const currentTime = Date.now();
                      
                      // Prevent selecting past times (extra validation layer)
                      if (!isNaN(selectedTime) && selectedTime < currentTime) {
                        setMsg('Start date and time cannot be in the past');
                        return;
                      }
                      
                      setStartDate(v);
                      setMsg(""); // Clear error messages when user makes changes
                      
                      // If end date exists and is now before new start date, clear it
                      if (endDate) {
                        const newStart = parseLocalDateTime(v);
                        const currentEnd = parseLocalDateTime(endDate);
                        if (!isNaN(newStart) && !isNaN(currentEnd) && currentEnd < newStart) {
                          setEndDate(''); // Clear end date so user selects a valid one
                        }
                      }
                    }}
                    min={nowLocal}
                    step="60"
                    className="w-full bg-white border border-slate-300 p-2.5 rounded-lg focus:ring-1 focus:ring-sky-500 focus:border-sky-500 text-slate-700 text-sm"
                    required
                  />
                  <p className="text-xs text-slate-500 mt-1">Past dates are disabled. Select current or future time only.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-800 mb-1">End Date & Time</label>
                  <input
                    type="datetime-local"
                    value={toLocalInputValue(endDate)}
                    onBlur={(e) => {
                      // Validate on blur (when user finishes selecting)
                      const v = e.target.value;
                      if (!v || !startDate) return;
                      
                      const selectedEnd = parseLocalDateTime(v);
                      const selectedStart = parseLocalDateTime(startDate);
                      
                      if (!isNaN(selectedStart) && !isNaN(selectedEnd) && selectedEnd < selectedStart) {
                        setMsg('End date and time must be after or equal to start date and time');
                        setEndDate(''); // Clear invalid selection
                        e.target.value = ''; // Clear input display
                      }
                    }}
                    onChange={(e) => {
                      const v = e.target.value;
                      
                      // Only update if valid value provided
                      if (!v) {
                        setEndDate('');
                        setMsg("");
                        return;
                      }
                      
                      const selectedEnd = parseLocalDateTime(v);
                      const selectedStart = parseLocalDateTime(startDate);
                      
                      // Prevent selecting end time before start time (extra validation layer)
                      if (!isNaN(selectedStart) && !isNaN(selectedEnd) && selectedEnd < selectedStart) {
                        setMsg('End date and time must be after or equal to start date and time');
                        return;
                      }
                      
                      setEndDate(v);
                      setMsg(""); // Clear error messages when user makes changes
                    }}
                    min={startDate ? toLocalInputValue(startDate) : nowLocal}
                    step="60"
                    disabled={!startDate}
                    className={`w-full border p-2.5 rounded-lg focus:ring-1 focus:ring-sky-500 focus:border-sky-500 text-slate-700 text-sm transition-colors ${
                      !startDate 
                        ? 'bg-slate-100 border-slate-200 cursor-not-allowed text-slate-400' 
                        : 'bg-white border-slate-300'
                    }`}
                    required
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    {!startDate ? 'Select start date first' : 'Must be after or equal to start time'}
                  </p>
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