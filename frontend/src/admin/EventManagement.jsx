/* eslint-disable no-unused-vars */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../utils/api";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, AlertCircle, ToggleRight, ToggleLeft, Calendar, FileText, Upload, X, Download } from "lucide-react";
import { toast } from 'react-toastify';
import DateTimePicker from "../components/DateTimePicker";

export default function EventManagement() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [template, setTemplate] = useState(null);
  const [msg, setMsg] = useState("");
  const [specialMode, setSpecialMode] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [csvValidationResults, setCsvValidationResults] = useState(null);
  const [showValidationPopup, setShowValidationPopup] = useState(false);
  const [csvError, setCsvError] = useState("");
  const navigate = useNavigate();

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStartDate("");
    setEndDate("");
    setTemplate(null);
    setCsvFile(null);
    setCsvValidationResults(null);
    setShowValidationPopup(false);
    setCsvError("");
  };

  // Handle CSV file selection and validate
  const handleCsvChange = async (e) => {
    const file = e.target.files?.[0] || null;
    setCsvFile(file);
    setCsvError("");
    setCsvValidationResults(null);
    
    if (!file) {
      setShowValidationPopup(false);
      return;
    }
    
    // Validate CSV
    try {
      const result = await api.checkSpecialEventCsv(file);
      setCsvValidationResults(result);
      
      // Check for errors
      const hasErrors = result.results?.some(r => 
        r.status === 'missing_fields' || 
        r.status === 'invalid_email' || 
        r.status === 'duplicate_in_file' ||
        r.status === 'error'
      );
      
      if (hasErrors) {
        setCsvError("CSV file has validation errors. Please review and fix them.");
        setShowValidationPopup(true);
      } else {
        const readyCount = result.results?.filter(r => r.status === 'ready').length || 0;
        if (readyCount > 0) {
          toast.success(`CSV validated: ${readyCount} student(s) ready`);
        } else {
          setCsvError("No valid students found in CSV");
          setShowValidationPopup(true);
        }
      }
    } catch (err) {
      setCsvError(err.message || 'Failed to validate CSV');
      toast.error('Failed to validate CSV: ' + (err.message || 'Unknown error'));
    }
  };

  const downloadCsvErrors = () => {
    if (!csvValidationResults?.results) return;
    
    const errorRows = csvValidationResults.results.filter(r => 
      r.status !== 'ready'
    );
    
    if (errorRows.length === 0) return;
    
    const headers = ['Row', 'Email', 'Student ID', 'Status', 'Details'];
    const rows = errorRows.map(r => [
      r.row || '',
      r.email || '',
      r.studentid || '',
      r.status || '',
      r.missing ? r.missing.join(', ') : (r.message || '')
    ]);
    
    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'special-event-csv-errors.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
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
    
    // Check CSV validation for special events
    if (specialMode && csvFile) {
      if (!csvValidationResults) {
        setMsg('Please wait for CSV validation to complete');
        return;
      }
      
      const hasErrors = csvValidationResults.results?.some(r => 
        r.status === 'missing_fields' || 
        r.status === 'invalid_email' || 
        r.status === 'duplicate_in_file' ||
        r.status === 'error'
      );
      
      if (hasErrors) {
        setMsg('Please fix CSV validation errors before creating the event');
        setShowValidationPopup(true);
        return;
      }
    }
    
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
      toastId = toast.loading('Creating your mock interview...');

      if (specialMode) {
        const res = await api.createSpecialEvent({ name: title, description, startDate: payloadStart, endDate: payloadEnd, template, csv: csvFile });
        const eventName = res.name || title;
        const newId = res._id || res.eventId;
        
        // Update toast to success and navigate immediately
        toast.update(toastId, { render: `Mock Interview "${eventName}" created successfully!`, type: 'success', isLoading: false, autoClose: 3000 });
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
        toast.update(toastId, { render: `Mock Interview "${eventName}" created successfully!`, type: 'success', isLoading: false, autoClose: 3000 });
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
      const errorMessage = err?.message || 'Failed to create mock interview';
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
              <h2 className="text-xl font-semibold text-slate-800">Create Mock Interview</h2>
              <p className="text-slate-600 text-sm">Set up a new interview practice session</p>
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
              {specialMode ? 'Special Interview' : 'Regular Interview'}
            </button>
          </div>

          <form onSubmit={handleCreateEvent}>
            <div className="space-y-3">
              {/* Event Title */}
              <div>
                <label className="block text-sm font-medium text-slate-800 mb-1">Interview Title</label>
                <input
                  type="text"
                  placeholder="Enter interview title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-white border border-slate-300 p-2.5 rounded-lg focus:ring-1 focus:ring-sky-500 focus:border-sky-500 text-slate-700 text-sm"
                  required
                />
              </div>

              {/* Event Description */}
              <div>
                <label className="block text-sm font-medium text-slate-800 mb-1">Interview Description</label>
                <textarea
                  placeholder="Describe the interview purpose and format..."
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
                  <DateTimePicker
                    value={startDate}
                    onChange={(isoDateTime) => {
                      if (!isoDateTime) {
                        setStartDate('');
                        setMsg("");
                        return;
                      }
                      
                      const selectedTime = new Date(isoDateTime).getTime();
                      const currentTime = Date.now();
                      
                      if (!isNaN(selectedTime) && selectedTime < currentTime) {
                        setMsg('Start date and time cannot be in the past. Please select a future time.');
                        setStartDate('');
                        return;
                      }
                      
                      setStartDate(isoDateTime);
                      setMsg("");
                      
                      // If end date exists and is now before new start date, clear it
                      if (endDate && parseLocalDateTime(isoDateTime) > parseLocalDateTime(endDate)) {
                        setEndDate('');
                      }
                    }}
                    min={localDateTimeNow()}
                    placeholder="Select start date and time"
                    className="text-sm"
                  />
                  <p className="text-xs text-slate-500 mt-1">Past dates are disabled. Select current or future time only.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-800 mb-1">End Date & Time</label>
                  <DateTimePicker
                    value={endDate}
                    onChange={(isoDateTime) => {
                      if (!isoDateTime) {
                        setEndDate('');
                        setMsg("");
                        return;
                      }
                      
                      const selectedEnd = new Date(isoDateTime).getTime();
                      const selectedStart = startDate ? new Date(startDate).getTime() : null;
                      
                      if (selectedStart && !isNaN(selectedStart) && !isNaN(selectedEnd) && selectedEnd < selectedStart) {
                        setMsg('End date and time must be after or equal to start date and time');
                        setEndDate('');
                        return;
                      }
                      
                      setEndDate(isoDateTime);
                      setMsg("");
                    }}
                    min={startDate || localDateTimeNow()}
                    disabled={!startDate}
                    placeholder="Select end date and time"
                    className="text-sm"
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
                      onChange={handleCsvChange}
                      className="hidden"
                      required={specialMode}
                    />
                  </label>
                  {csvFile && (
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-2 p-2 bg-white rounded border border-sky-200">
                        <FileText className="w-4 h-4 text-sky-600" />
                        <span className="text-sky-800 text-sm">{csvFile.name}</span>
                      </div>
                      {csvValidationResults && (
                        <button
                          type="button"
                          onClick={() => setShowValidationPopup(true)}
                          className="text-xs text-sky-600 hover:text-sky-700 underline"
                        >
                          View validation results ({csvValidationResults.count} rows)
                        </button>
                      )}
                    </div>
                  )}
                  {csvError && (
                    <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
                      {csvError}
                    </div>
                  )}
                  <p className="text-xs text-slate-600 mt-2">
                    CSV headers: name, email, studentid, branch (required). Optional: course, college, password.
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
                {specialMode ? 'Create Special Interview' : 'Create Mock Interview'}
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

      {/* CSV Validation Popup Modal */}
      <AnimatePresence>
        {showValidationPopup && csvValidationResults && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowValidationPopup(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            >
              {/* Header */}
              <div className="bg-sky-500 text-white px-6 py-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">CSV Validation Results</h2>
                <button
                  onClick={() => setShowValidationPopup(false)}
                  className="text-white hover:text-sky-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                {/* Summary */}
                <div className="mb-4 flex gap-4">
                  <div className="flex-1 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                    <div className="text-2xl font-bold text-emerald-700">
                      {csvValidationResults.results?.filter(r => r.status === 'ready').length || 0}
                    </div>
                    <div className="text-xs text-emerald-600">Ready to create</div>
                  </div>
                  <div className="flex-1 bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="text-2xl font-bold text-red-700">
                      {csvValidationResults.results?.filter(r => r.status !== 'ready').length || 0}
                    </div>
                    <div className="text-xs text-red-600">Errors</div>
                  </div>
                </div>

                {/* Download Errors Button */}
                {csvValidationResults.results?.some(r => r.status !== 'ready') && (
                  <button
                    onClick={downloadCsvErrors}
                    className="mb-4 flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Download Errors CSV
                  </button>
                )}

                {/* Results Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border border-slate-200 rounded-lg">
                    <thead>
                      <tr className="bg-slate-50 text-left text-slate-700">
                        <th className="py-2 px-3 text-xs font-semibold w-16">Row</th>
                        <th className="py-2 px-3 text-xs font-semibold min-w-[180px]">Email</th>
                        <th className="py-2 px-3 text-xs font-semibold w-24">Student ID</th>
                        <th className="py-2 px-3 text-xs font-semibold w-32">Status</th>
                        <th className="py-2 px-3 text-xs font-semibold">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvValidationResults.results.map((r, i) => (
                        <tr
                          key={i}
                          className={`border-t border-slate-100 ${
                            r.status !== 'ready' ? 'bg-red-50' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-2 px-3 text-xs text-slate-600">{r.row || '-'}</td>
                          <td className="py-2 px-3 text-xs text-slate-800">{r.email || '-'}</td>
                          <td className="py-2 px-3 text-xs text-slate-800">{r.studentid || '-'}</td>
                          <td className={`py-2 px-3 text-xs font-medium ${
                            r.status === 'ready' ? 'text-emerald-600' : 'text-red-600'
                          }`}>
                            {r.status}
                          </td>
                          <td className="py-2 px-3 text-xs text-slate-600">
                            {r.missing ? `Missing: ${r.missing.join(', ')}` : r.message || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-200">
                <button
                  onClick={() => setShowValidationPopup(false)}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 text-sm"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* react-toastify handles toasts globally */}
    </div>
  );
}