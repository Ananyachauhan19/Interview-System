import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../utils/api";
import { Upload, CheckCircle, AlertCircle } from "lucide-react";

export default function StudentOnboarding() {
  const [csvFile, setCsvFile] = useState(null);
  const [students, setStudents] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [uploadResult, setUploadResult] = useState(null);
  const [clientErrors, setClientErrors] = useState([]);
  const [showSingleForm, setShowSingleForm] = useState(false);
  // order fields as CSV: course, name, email, studentid, password, branch, college
  const [singleForm, setSingleForm] = useState({ course: '', name: '', email: '', studentid: '', password: '', branch: '', college: '' });
  const [singleMsg, setSingleMsg] = useState('');
  const [singleLoading, setSingleLoading] = useState(false);

  const errorsByRow = clientErrors.reduce((acc, cur) => {
    const msg = cur.details ? (Array.isArray(cur.details) ? cur.details.join(', ') : cur.details) : cur.error;
    if (!acc[cur.row]) acc[cur.row] = [];
    acc[cur.row].push(msg || cur.error);
    return acc;
  }, {});

  function downloadErrorsCsv() {
    if (!students || students.length === 0) return;
    const headerKeys = Object.keys(students[0]).filter((k) => k !== '__row');
    const header = [...headerKeys, 'error'];
    const rows = [];
    for (const s of students) {
      const rowNum = s.__row;
      const errs = errorsByRow[rowNum];
      if (!errs) continue; // only include rows with errors
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

  // Parse CSV file and extract student data
  const handleFileChange = (e) => {
    setError("");
    setSuccess("");
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
          const obj = { __row: i + 2 }; // keep original CSV row number (header is line 1)
          cols.forEach((c, idx) => (obj[c] = vals[idx]?.trim() || ''));
          return obj;
        });

        // Client-side validation
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

        // Auto-upload when there are no client-side errors
        if (errs.length === 0) {
          try {
            const data = await api.uploadStudentsCsv(file);
            setUploadResult(data);
            setSuccess(`Processed ${data.count} rows (auto-upload)`);
          } catch (uploadErr) {
            setError(uploadErr.message || 'Upload failed');
          }
        }
      } catch (err) {
        setError(err.message);
        setStudents([]);
        setClientErrors([]);
      }
    };
    reader.readAsText(file);
  };

  const handleUpload = async () => {
    if (!csvFile) return;
    setError("");
    setSuccess("");
    // prevent upload if client-side errors exist
    if (clientErrors.length > 0) {
      setError('Please fix CSV errors before uploading. See details below.');
      return;
    }
    try {
      const data = await api.uploadStudentsCsv(csvFile);
      setUploadResult(data);
      setSuccess(`Processed ${data.count} rows`);
    } catch (err) {
      setError(err.message);
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
    if (!emailRegex.test(email)) { setSingleMsg('Invalid email'); return; }
    try {
      const data = await api.createStudent(singleForm);
      setSingleMsg('Student created: ' + (data.email || data.studentid));
      // show success briefly
      setTimeout(() => setSingleMsg(''), 4000);
  // add to preview with keys in CSV order
  const newStudent = { course: singleForm.course || '', name: singleForm.name || '', email: singleForm.email || '', studentid: singleForm.studentid || '', password: singleForm.password || '', branch: singleForm.branch || '', college: singleForm.college || '', __row: 'N/A' };
  setStudents((s) => [newStudent, ...s]);
      setSingleForm({ name: '', email: '', studentid: '', password: '', branch: '', course: '', college: '' });
      setSingleLoading(false);
    } catch (err) {
      setSingleMsg(err.message);
      setSingleLoading(false);
    }
  };

  const isSingleValid = () => {
    const { name, email, studentid, branch } = singleForm;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return name && email && studentid && branch && emailRegex.test(email);
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
            Student Onboarding
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-gray-600 mb-6 text-center text-base"
          >
            Upload a CSV file with student credentials (name, email, password).
          </motion.p>
          <div className="flex justify-center mb-4">
            <button onClick={() => setShowSingleForm(!showSingleForm)} className="text-sm text-blue-600 underline">{showSingleForm ? 'Hide Add Single Student' : 'Add Single Student'}</button>
          </div>
          {showSingleForm && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input value={singleForm.name} onChange={(e) => handleSingleChange('name', e.target.value)} placeholder="Name" className="p-2 border rounded" />
                <input value={singleForm.email} onChange={(e) => handleSingleChange('email', e.target.value)} placeholder="Email" className="p-2 border rounded" />
                <input value={singleForm.studentid} onChange={(e) => handleSingleChange('studentid', e.target.value)} placeholder="Student ID" className="p-2 border rounded" />
                <input value={singleForm.branch} onChange={(e) => handleSingleChange('branch', e.target.value)} placeholder="Branch" className="p-2 border rounded" />
                <input value={singleForm.course} onChange={(e) => handleSingleChange('course', e.target.value)} placeholder="Course" className="p-2 border rounded" />
                <input value={singleForm.college} onChange={(e) => handleSingleChange('college', e.target.value)} placeholder="College" className="p-2 border rounded" />
                <input value={singleForm.password} onChange={(e) => handleSingleChange('password', e.target.value)} placeholder="Password (optional)" className="p-2 border rounded" />
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={submitSingle} disabled={!isSingleValid() || singleLoading} className={`p-2 rounded ${(!isSingleValid() || singleLoading) ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-blue-600 text-white'}`}>
                  {singleLoading ? 'Creating...' : 'Create'}
                </button>
                <button onClick={() => { setShowSingleForm(false); setSingleMsg(''); }} className="p-2 bg-white border rounded">Cancel</button>
              </div>
              {singleMsg && (
                <div className={`mt-2 text-sm ${singleMsg.toLowerCase().includes('created') ? 'text-green-600' : 'text-red-600'}`}>
                  {singleMsg}
                </div>
              )}
            </div>
          )}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="mb-6"
          >
            <label className="flex items-center justify-center w-full p-4 bg-gray-50 rounded-xl border border-gray-200 hover:bg-gray-100 transition-all duration-200 cursor-pointer">
              <Upload className="w-5 h-5 text-blue-500 mr-2" />
              <span className="text-gray-700 font-medium">Choose CSV File</span>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
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
          </motion.div>
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="flex items-center justify-center text-red-600 mb-4 text-sm"
              >
                <AlertCircle className="w-5 h-5 mr-2" />
                {error}
              </motion.div>
            )}
            {success && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="flex items-center justify-center text-green-600 mb-4 text-sm"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                {success}
              </motion.div>
            )}
          </AnimatePresence>
          {students.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="overflow-x-auto mt-6"
            >
              <table className="min-w-full border border-gray-100 rounded-xl">
                <thead>
                  <tr className="bg-gray-50">
                    {Object.keys(students[0]).filter(k => k !== '__row').map((k) => (
                      <th
                        key={k}
                        className="py-3 px-6 border-b text-left text-sm font-semibold text-gray-800"
                      >
                        {k.charAt(0).toUpperCase() + k.slice(1)}
                      </th>
                    ))}
                    <th className="py-3 px-6 border-b text-left text-sm font-semibold text-gray-800">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, idx) => (
                    <motion.tr
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 + idx * 0.1 }}
                      className="text-left hover:bg-gray-50 transition-all duration-200"
                    >
                      {Object.keys(students[0]).filter(k => k !== '__row').map((k) => (
                        <td
                          key={k}
                          className="py-3 px-6 border-b text-sm text-gray-700"
                        >
                          {student[k]}
                        </td>
                      ))}
                      <td className="py-3 px-6 border-b text-sm text-rose-700">
                        {(errorsByRow[student.__row] || []).join('; ')}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: "0 10px 20px -5px rgba(59, 130, 246, 0.3)" }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleUpload}
                  disabled={clientErrors.length > 0}
                  className={`mt-6 w-full p-3 rounded-xl font-semibold transition-all duration-200 shadow-md ${clientErrors.length > 0 ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600'}`}
                >
                  Upload to Server
                </motion.button>
                <button
                  onClick={() => { setStudents([]); setCsvFile(null); setClientErrors([]); setUploadResult(null); setError(''); setSuccess(''); }}
                  className="mt-6 w-full bg-white border border-gray-200 text-gray-700 p-3 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200"
                >
                  Clear
                </button>
                <button
                  onClick={downloadErrorsCsv}
                  disabled={clientErrors.length === 0}
                  className={`mt-6 w-full p-3 rounded-xl font-semibold transition-all duration-200 ${clientErrors.length === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-rose-500 text-white hover:bg-rose-600'}`}
                >
                  Download Errors CSV
                </button>
              </div>
              <AnimatePresence>
                {uploadResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="mt-4 text-sm text-gray-600 text-center"
                  >
                    {uploadResult.count} records processed.
                    <div className="mt-2 text-left max-w-4xl mx-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-gray-600">
                            <th className="py-1">Row</th>
                            <th className="py-1">Email</th>
                            <th className="py-1">StudentId</th>
                            <th className="py-1">Status</th>
                            <th className="py-1">Message</th>
                          </tr>
                        </thead>
                        <tbody>
                          {uploadResult.results.map((r, i) => (
                            <tr key={i} className="border-t">
                              <td className="py-1">{r.row || '-'}</td>
                              <td className="py-1">{r.email || '-'}</td>
                              <td className="py-1">{r.studentid || '-'}</td>
                              <td className={`py-1 ${r.status === 'created' ? 'text-green-600' : 'text-rose-600'}`}>{r.status}</td>
                              <td className="py-1">{r.message || (r.status === 'exists' ? 'Already exists' : '')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {clientErrors.length > 0 && (
            <div className="mt-6 bg-rose-50 border border-rose-100 p-4 rounded-lg">
              <h3 className="font-semibold text-rose-700 mb-2">CSV Errors (fix before upload)</h3>
              <ul className="text-sm text-rose-700">
                {clientErrors.map((ce, i) => (
                  <li key={i}>Row {ce.row}: {ce.error} {ce.details ? `(${Array.isArray(ce.details) ? ce.details.join(', ') : ce.details})` : ''}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}