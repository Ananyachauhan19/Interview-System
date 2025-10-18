/* eslint-disable no-unused-vars */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../utils/api";
import { Upload, CheckCircle, AlertCircle, Plus, Loader2, FileText, Download, Users, BookOpen, Shield, ArrowRight } from "lucide-react";

export default function StudentOnboarding() {
  const [csvFile, setCsvFile] = useState(null);
  const [students, setStudents] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [uploadResult, setUploadResult] = useState(null);
  const [clientErrors, setClientErrors] = useState([]);
  const [showSingleForm, setShowSingleForm] = useState(false);
  const [singleForm, setSingleForm] = useState({ course: '', name: '', email: '', studentid: '', password: '', branch: '', college: '' });
  const [singleMsg, setSingleMsg] = useState('');
  const [singleLoading, setSingleLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const errorsByRow = clientErrors.reduce((acc, cur) => {
    const msg = cur.details ? (Array.isArray(cur.details) ? cur.details.join(', ') : cur.details) : cur.error;
    if (!acc[cur.row]) acc[cur.row] = [];
    acc[cur.row].push(msg || cur.error);
    return acc;
  }, {});

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange({ target: { files: e.dataTransfer.files } });
    }
  };

  function downloadErrorsCsv() {
    if (!students || students.length === 0) return;
    const headerKeys = Object.keys(students[0]).filter((k) => k !== '__row');
    const header = [...headerKeys, 'error'];
    const rows = [];
    for (const s of students) {
      const rowNum = s.__row;
      const errs = errorsByRow[rowNum];
      if (!errs) continue;
      const values = headerKeys.map((k) => `"${(s[k] ?? '').toString().replace(/"/g, '""')}"`);
      values.push(`"${errs.join('; ').replace(/"/g, '""')}"`);
      rows.push(values.join(','));
    }
    const csv = header.map((h) => `"${h}"`).join(',') + '\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `students-errors.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const handleFileChange = (e) => {
    setError("");
    setSuccess("");
    setUploadSuccess(false);
    const file = e.target.files[0];
    setCsvFile(file);
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      try {
        const rows = text.trim().split(/\r?\n/);
        const header = rows.shift();
        const cols = header.split(',').map((s) => s.trim().toLowerCase());
        const parsed = rows.map((row, i) => {
          const vals = row.split(',');
          const obj = { __row: i + 2 };
          cols.forEach((c, idx) => (obj[c] = vals[idx]?.trim() || ''));
          return obj;
        });

        const errs = [];
        const seenEmails = new Set();
        const seenIds = new Set();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        parsed.forEach((r) => {
          const rowNum = r.__row;
          const missing = [];
          if (!r.name) missing.push('name');
          if (!r.email) missing.push('email');
          if (!r.studentid && !r.student_id && !r.sid) missing.push('studentid');
          if (!r.branch) missing.push('branch');
          if (missing.length > 0) errs.push({ row: rowNum, error: 'missing_fields', details: missing });
          else {
            const email = r.email.toLowerCase();
            if (!emailRegex.test(email)) errs.push({ row: rowNum, error: 'invalid_email' });
            if (seenEmails.has(email)) errs.push({ row: rowNum, error: 'duplicate_in_file', details: 'email' });
            if (seenIds.has(r.studentid || r.student_id || r.sid)) errs.push({ row: rowNum, error: 'duplicate_in_file', details: 'studentid' });
            seenEmails.add(email);
            seenIds.add(r.studentid || r.student_id || r.sid);
          }
        });

        setStudents(parsed);
        setClientErrors(errs);
        setSuccess("CSV parsed successfully. Preview below.");

        if (errs.length === 0) {
          setIsUploading(true);
          try {
            const data = await api.uploadStudentsCsv(file);
            setUploadResult(data);
            setSuccess(`Upload successful! Processed ${data.count} rows`);
            setUploadSuccess(true);
          } catch (uploadErr) {
            setError(uploadErr.message || 'Upload failed');
            setUploadSuccess(false);
          } finally {
            setIsUploading(false);
          }
        }
      } catch (err) {
        setError(err.message || 'Error parsing CSV');
        setStudents([]);
        setClientErrors([]);
        setUploadSuccess(false);
      }
    };
    reader.readAsText(file);
  };

  const handleUpload = async () => {
    if (!csvFile) {
      setError("Please select a CSV file first");
      return;
    }
    setError("");
    setSuccess("");
    setUploadSuccess(false);
    if (clientErrors.length > 0) {
      setError('Please fix CSV errors before uploading. See details below.');
      return;
    }
    setIsUploading(true);
    try {
      const data = await api.uploadStudentsCsv(csvFile);
      setUploadResult(data);
      setSuccess(`Upload successful! Processed ${data.count} rows`);
      setUploadSuccess(true);
    } catch (err) {
      setError(err.message || 'Upload failed');
      setUploadSuccess(false);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSingleChange = (k, v) => setSingleForm((s) => ({ ...s, [k]: v }));

  const submitSingle = async () => {
    setSingleMsg('');
    setSingleLoading(true);
    const { name, email, studentid, branch } = singleForm;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!name || !email || !studentid || !branch) {
      setSingleMsg('Please fill required fields: name, email, studentid, branch');
      setSingleLoading(false);
      return;
    }
    if (!emailRegex.test(email)) {
      setSingleMsg('Invalid email format');
      setSingleLoading(false);
      return;
    }
    try {
      const data = await api.createStudent(singleForm);
      setSingleMsg('Student created: ' + (data.email || data.studentid));
      setTimeout(() => setSingleMsg(''), 4000);
      const newStudent = { course: singleForm.course || '', name: singleForm.name || '', email: singleForm.email || '', studentid: singleForm.studentid || '', password: singleForm.password || '', branch: singleForm.branch || '', college: singleForm.college || '', __row: 'N/A' };
      setStudents((s) => [newStudent, ...s]);
      setSingleForm({ name: '', email: '', studentid: '', password: '', branch: '', course: '', college: '' });
    } catch (err) {
      setSingleMsg(err.message || 'Failed to create student');
    } finally {
      setSingleLoading(false);
    }
  };

  const isSingleValid = () => {
    const { name, email, studentid, branch } = singleForm;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return name && email && studentid && branch && emailRegex.test(email);
  };

  useEffect(() => {
    if (uploadSuccess) {
      const timer = setTimeout(() => setUploadSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [uploadSuccess]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-6 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-7xl bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col"
      >
        {/* Header Section - Logo Left, Text Right */}
        <div className="flex items-center gap-4 mb-6 mt-10">
          <div className="flex-shrink-0 w-12 h-12 bg-indigo-800 rounded-lg flex items-center justify-center shadow-sm">
            <Users className="text-white w-6 h-6" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-slate-900">Student Onboarding</h1>
            <p className="text-slate-600 text-sm mt-1">
              Efficiently onboard students via bulk CSV upload or individual entry with real-time validation.
            </p>
          </div>
        </div>

        {/* Guidelines Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6"
        >
          <div className="flex items-start gap-3">
            <BookOpen className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-slate-800 mb-2">CSV Upload Guidelines</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-700">
                <div className="space-y-1">
                  <p><strong>Required columns:</strong> Name, Email, Student ID, Branch</p>
                  <p><strong>Optional columns:</strong> Course, College, Password</p>
                </div>
                <div className="space-y-1">
                  <p><strong>Password:</strong> Optional — auto-generated if not provided.</p>
                  <p><strong>Duplicates:</strong> Automatically detected and skipped.</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          <motion.a
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            href="/sample-students.csv"
            download
            className="flex items-center px-4 py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg shadow-sm hover:bg-emerald-600 transition-all duration-200"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Sample CSV
          </motion.a>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowSingleForm(!showSingleForm)}
            className="flex items-center px-4 py-2 bg-sky-500 text-white text-sm font-medium rounded-lg shadow-sm hover:bg-sky-600 transition-all duration-200"
          >
            <Plus className="w-4 h-4 mr-2" />
            {showSingleForm ? 'Hide Single Entry' : 'Add Single Student'}
          </motion.button>
        </div>

        {/* Single Student Form */}
        {showSingleForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-slate-50 p-4 rounded-lg mb-6 border border-slate-200"
          >
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Add Individual Student</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { key: 'name', label: 'Full Name *', placeholder: 'John Doe' },
                { key: 'email', label: 'Email Address *', placeholder: 'john@university.edu' },
                { key: 'studentid', label: 'Student ID *', placeholder: 'STU2024001' },
                { key: 'branch', label: 'Branch *', placeholder: 'Computer Science' },
                { key: 'course', label: 'Course', placeholder: 'B.Tech' },
                { key: 'college', label: 'College', placeholder: 'University Name' },
                { key: 'password', label: 'Password (optional)', placeholder: '••••••••', type: 'password' },
              ].map(({ key, label, placeholder, type }) => (
                <div key={key} className="flex flex-col">
                  <label className="text-xs font-medium text-slate-700 mb-1">{label}</label>
                  <input
                    type={type || 'text'}
                    value={singleForm[key]}
                    onChange={(e) => handleSingleChange(key, e.target.value)}
                    placeholder={placeholder}
                    className="p-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-transparent transition-all duration-200 bg-white"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-4 justify-end">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { setShowSingleForm(false); setSingleMsg(''); }}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-all duration-200"
              >
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={submitSingle}
                disabled={!isSingleValid() || singleLoading}
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  !isSingleValid() || singleLoading
                    ? 'bg-slate-300 text-slate-600 cursor-not-allowed'
                    : 'bg-sky-500 text-white hover:bg-sky-600'
                }`}
              >
                {singleLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Student'
                )}
              </motion.button>
            </div>
            {singleMsg && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`mt-3 p-2 rounded text-xs font-medium ${
                  singleMsg.toLowerCase().includes('created') 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {singleMsg}
              </motion.div>
            )}
          </motion.div>
        )}

        {/* File Upload Section */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <div
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
              dragActive 
                ? 'border-sky-400 bg-sky-50' 
                : 'border-slate-300 bg-slate-50 hover:border-sky-300 hover:bg-sky-50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="space-y-3">
              <div className="w-12 h-12 bg-sky-500 rounded-lg flex items-center justify-center mx-auto shadow-sm">
                <Upload className="text-white w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800 mb-1">
                  {dragActive ? 'Drop your CSV file here' : 'Upload student CSV file'}
                </p>
                <p className="text-slate-600 text-xs">
                  Drag and drop the CSV file here, or click to browse.
                </p>
              </div>
            </div>
          </div>
    {csvFile && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 mt-3 p-2 bg-sky-50 rounded border border-sky-200"
            >
              <FileText className="w-4 h-4 text-sky-600" />
              <span className="text-sky-800 text-sm font-medium">{csvFile.name}</span>
                <span className="text-sky-600 text-xs">({(csvFile.size / 1024).toFixed(1)} KB)</span>
            </motion.div>
          )}
        </motion.div>

        {/* Stats Cards */}
        {students.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
          >
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm">Total Students</p>
                  <p className="text-2xl font-semibold text-slate-900">{students.length}</p>
                </div>
                <Users className="text-indigo-600 w-6 h-6" />
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm">Valid records</p>
                  <p className="text-2xl font-semibold text-slate-900">{students.length - clientErrors.length}</p>
                </div>
                <CheckCircle className="text-emerald-500 w-6 h-6" />
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm">Errors found</p>
                  <p className="text-2xl font-semibold text-slate-900">{clientErrors.length}</p>
                </div>
                <AlertCircle className="text-red-400 w-6 h-6" />
              </div>
            </div>
          </motion.div>
        )}

        {/* Status Messages */}
        <AnimatePresence>
              {error && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="flex items-center gap-2 text-red-700 mb-4 text-sm bg-red-50 p-3 rounded-lg border border-red-200"
            >
              <AlertCircle className="w-4 h-4" />
                    {error}
            </motion.div>
          )}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="flex items-center gap-2 text-emerald-700 mb-4 text-sm bg-emerald-50 p-3 rounded-lg border border-emerald-200"
            >
              <CheckCircle className="w-4 h-4" />
                    {success}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Data Table and Actions */}
        {students.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex-1 flex flex-col"
          >
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Student Records</h3>
                <p className="text-slate-600 text-sm">{students.length} records loaded • {clientErrors.length} errors to fix</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleUpload}
                  disabled={clientErrors.length > 0 || isUploading || uploadSuccess}
                  className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    clientErrors.length > 0 || isUploading || uploadSuccess
                      ? 'bg-slate-300 text-slate-600 cursor-not-allowed'
                      : 'bg-emerald-500 text-white hover:bg-emerald-600'
                  }`}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : uploadSuccess ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Uploaded
                    </>
                  ) : (
                    'Upload to Server'
                  )}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={downloadErrorsCsv}
                  disabled={clientErrors.length === 0}
                  className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    clientErrors.length === 0 
                      ? 'bg-slate-200 text-slate-500 cursor-not-allowed' 
                      : 'bg-red-400 text-white hover:bg-red-500'
                  }`}
                >
                  Download Errors CSV
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { setStudents([]); setCsvFile(null); setClientErrors([]); setUploadResult(null); setError(''); setSuccess(''); setUploadSuccess(false); }}
                  className="px-3 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-all duration-200"
                >
                  Clear All
                </motion.button>
              </div>
            </div>

            {/* Upload Results */}
            <AnimatePresence>
              {uploadResult && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="mb-6 bg-white p-4 rounded-lg border border-slate-200 shadow-sm"
                >
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">
                    Existing Records - {uploadResult.count} records processed
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border border-slate-200 rounded-lg bg-white">
                      <thead>
                        <tr className="bg-slate-50 text-left text-slate-700">
                          <th className="py-2 px-3 whitespace-nowrap text-xs font-semibold w-16">Row</th>
                          <th className="py-2 px-3 whitespace-nowrap text-xs font-semibold min-w-[180px]">Email</th>
                          <th className="py-2 px-3 whitespace-nowrap text-xs font-semibold w-24">Student ID</th>
                          <th className="py-2 px-3 whitespace-nowrap text-xs font-semibold w-20">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {uploadResult.results.map((r, i) => (
                          <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                            <td className="py-2 px-3 whitespace-nowrap text-xs text-slate-600">{r.row || '-'}</td>
                            <td className="py-2 px-3 whitespace-nowrap text-xs text-slate-800">{r.email || '-'}</td>
                            <td className="py-2 px-3 whitespace-nowrap text-xs text-slate-800">{r.studentid || '-'}</td>
                            <td className={`py-2 px-3 whitespace-nowrap text-xs font-medium ${
                              r.status === 'created' ? 'text-emerald-500' : 'text-amber-500'
                            }`}>
                              {r.status}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error Summary */}
            {clientErrors.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 bg-red-50 border border-red-200 p-4 rounded-lg shadow-sm"
              >
                <h3 className="font-semibold text-red-800 mb-3 text-sm">
                  CSV Validation Errors ({clientErrors.length} errors found)
                </h3>
                <div className="max-h-48 overflow-y-auto">
                  <ul className="text-xs text-red-700 space-y-2">
                    {clientErrors.map((ce, i) => (
                      <li key={i} className="p-2 bg-red-100 rounded border border-red-200 max-w-full break-words">
                        <span className="font-medium">Row {ce.row}:</span> {ce.error}
                        {ce.details ? ` (${Array.isArray(ce.details) ? ce.details.join(', ') : ce.details})` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}

            {/* Data Table */}
            <div className="overflow-auto rounded-lg border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full">
                <thead className="bg-slate-50">
                  <tr>
                    {Object.keys(students[0]).filter(k => k !== '__row').map((k) => (
                      <th
                        key={k}
                        className="py-3 px-4 border-b text-left text-xs font-semibold text-slate-700 uppercase tracking-wider whitespace-nowrap"
                      >
                        {k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </th>
                    ))}
                    <th className="py-3 px-4 border-b text-left text-xs font-semibold text-slate-700 uppercase tracking-wider whitespace-nowrap">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {students.map((student, idx) => (
                    <motion.tr
                      key={idx}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + idx * 0.03 }}
                      className="hover:bg-slate-50 transition-colors duration-150"
                    >
                      {Object.keys(students[0]).filter(k => k !== '__row').map((k) => (
                        <td
                          key={k}
                          className="py-3 px-4 text-sm text-slate-600 whitespace-nowrap"
                        >
                          {student[k] || (
                            <span className="text-slate-400 italic">empty</span>
                          )}
                        </td>
                      ))}
                      <td className="py-3 px-4 text-sm whitespace-nowrap">
                        {(errorsByRow[student.__row] || []).length > 0 ? (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            {errorsByRow[student.__row].length} error(s)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Valid
                          </span>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}