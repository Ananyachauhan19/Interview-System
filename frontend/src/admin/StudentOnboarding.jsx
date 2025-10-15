import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../utils/api";
import { Upload, CheckCircle, AlertCircle, Plus, Loader2 } from "lucide-react";

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
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-6 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full bg-white rounded-2xl shadow-xl border border-gray-200 p-6 lg:p-8 flex flex-col h-full"
      >
       <motion.h2
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.2 }}
  className="text-3xl font-bold text-gray-900 mb-4 mt-6 text-center" // Added mt-6 for extra top spacing
>
  Student Onboarding Dashboard
</motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-gray-600 mb-6 text-center text-base"
        >
          Efficiently onboard students via CSV upload or individual entry.
        </motion.p>

        <div className="flex justify-center mb-6">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowSingleForm(!showSingleForm)}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition-all duration-200"
          >
            <Plus className="w-5 h-5 mr-2" />
            {showSingleForm ? 'Hide Add Student' : 'Add Single Student'}
          </motion.button>
        </div>

        {showSingleForm && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="bg-gray-50 p-6 rounded-lg mb-6 shadow-inner border border-gray-200"
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Add Individual Student</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { key: 'name', label: 'Name *', placeholder: 'Enter name' },
                { key: 'email', label: 'Email *', placeholder: 'Enter email' },
                { key: 'studentid', label: 'Student ID *', placeholder: 'Enter student ID' },
                { key: 'branch', label: 'Branch *', placeholder: 'Enter branch' },
                { key: 'course', label: 'Course', placeholder: 'Enter course' },
                { key: 'college', label: 'College', placeholder: 'Enter college' },
                { key: 'password', label: 'Password (optional)', placeholder: 'Enter password', type: 'password' },
              ].map(({ key, label, placeholder, type }) => (
                <div key={key} className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input
                    type={type || 'text'}
                    value={singleForm[key]}
                    onChange={(e) => handleSingleChange(key, e.target.value)}
                    placeholder={placeholder}
                    className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-6 justify-end">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={submitSingle}
                disabled={!isSingleValid() || singleLoading}
                className={`flex items-center px-4 py-2 rounded-lg font-semibold transition-all duration-200 shadow-md ${
                  !isSingleValid() || singleLoading ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {singleLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Student'
                )}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { setShowSingleForm(false); setSingleMsg(''); }}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all duration-200 shadow-md"
              >
                Cancel
              </motion.button>
            </div>
            {singleMsg && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`mt-4 text-sm ${singleMsg.toLowerCase().includes('created') ? 'text-green-600' : 'text-red-600'}`}
              >
                {singleMsg}
              </motion.div>
            )}
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="mb-6"
        >
          <label className="flex items-center justify-center w-full p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-all duration-200 cursor-pointer">
            <Upload className="w-5 h-5 text-indigo-500 mr-2" />
            <span className="text-gray-700 font-semibold">Upload CSV File</span>
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
              className="flex items-center justify-center text-red-600 mb-4 text-sm bg-red-50 p-3 rounded-lg shadow-sm"
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
              className="flex items-center justify-center text-green-600 mb-4 text-sm bg-green-50 p-3 rounded-lg shadow-sm"
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
            className="mt-6 flex-1 flex flex-col"
          >
            <div className="flex flex-col sm:flex-row sm:justify-end gap-4 mb-6">
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: "0 10px 20px -5px rgba(79, 70, 229, 0.3)" }}
                whileTap={{ scale: 0.95 }}
                onClick={handleUpload}
                disabled={clientErrors.length > 0 || isUploading || uploadSuccess}
                className={`flex items-center justify-center px-4 py-2 rounded-lg font-semibold transition-all duration-200 shadow-md ${
                  clientErrors.length > 0 || isUploading || uploadSuccess
                    ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600'
                }`}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : uploadSuccess ? (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Successfully Uploaded
                  </>
                ) : (
                  'Upload to Server'
                )}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { setStudents([]); setCsvFile(null); setClientErrors([]); setUploadResult(null); setError(''); setSuccess(''); setUploadSuccess(false); }}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all duration-200 shadow-md"
              >
                Clear
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={downloadErrorsCsv}
                disabled={clientErrors.length === 0}
                className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 shadow-md ${
                  clientErrors.length === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-red-500 text-white hover:bg-red-600'
                }`}
              >
                Download Errors CSV
              </motion.button>
            </div>

            <div className="overflow-auto rounded-lg border border-gray-200 shadow-sm flex-1">
              <table className="min-w-full">
                <thead className="sticky top-0 bg-gray-100 z-10">
                  <tr>
                    {Object.keys(students[0]).filter(k => k !== '__row').map((k) => (
                      <th
                        key={k}
                        className="py-3 px-6 border-b text-left text-sm font-semibold text-gray-800 whitespace-nowrap"
                      >
                        {k.charAt(0).toUpperCase() + k.slice(1)}
                      </th>
                    ))}
                    <th className="py-3 px-6 border-b text-left text-sm font-semibold text-gray-800 whitespace-nowrap">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, idx) => (
                    <motion.tr
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 + idx * 0.05 }}
                      className="text-left hover:bg-gray-50 transition-all duration-200"
                    >
                      {Object.keys(students[0]).filter(k => k !== '__row').map((k) => (
                        <td
                          key={k}
                          className="py-3 px-6 border-b text-sm text-gray-700 whitespace-nowrap"
                        >
                          {student[k] || '-'}
                        </td>
                      ))}
                      <td className="py-3 px-6 border-b text-sm text-red-600 whitespace-nowrap">
                        {(errorsByRow[student.__row] || []).join('; ')}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            <AnimatePresence>
              {uploadResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="mt-6 bg-gray-50 p-6 rounded-lg shadow-inner border border-gray-200"
                >
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">{uploadResult.count} records processed</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border border-gray-200 rounded-lg">
                      <thead>
                        <tr className="bg-gray-100 text-left text-gray-600">
                          <th className="py-2 px-4 whitespace-nowrap">Row</th>
                          <th className="py-2 px-4 whitespace-nowrap">Email</th>
                          <th className="py-2 px-4 whitespace-nowrap">Student ID</th>
                          <th className="py-2 px-4 whitespace-nowrap">Status</th>
                          <th className="py-2 px-4 whitespace-nowrap">Message</th>
                        </tr>
                      </thead>
                      <tbody>
                        {uploadResult.results.map((r, i) => (
                          <tr key={i} className="border-t">
                            <td className="py-2 px-4 whitespace-nowrap">{r.row || '-'}</td>
                            <td className="py-2 px-4 whitespace-nowrap">{r.email || '-'}</td>
                            <td className="py-2 px-4 whitespace-nowrap">{r.studentid || '-'}</td>
                            <td className={`py-2 px-4 whitespace-nowrap ${r.status === 'created' ? 'text-green-600' : 'text-red-600'}`}>{r.status}</td>
                            <td className="py-2 px-4 whitespace-nowrap">{r.message || (r.status === 'exists' ? 'Already exists' : '')}</td>
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
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 bg-red-50 border border-red-200 p-6 rounded-lg shadow-inner"
          >
            <h3 className="font-semibold text-red-700 mb-3 text-lg">CSV Errors (Fix Before Upload)</h3>
            <ul className="text-sm text-red-700 list-disc pl-5">
              {clientErrors.map((ce, i) => (
                <li key={i}>Row {ce.row}: {ce.error} {ce.details ? `(${Array.isArray(ce.details) ? ce.details.join(', ') : ce.details})` : ''}</li>
              ))}
            </ul>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}