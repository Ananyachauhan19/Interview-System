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

  // Parse CSV file and extract student data
  const handleFileChange = (e) => {
    setError("");
    setSuccess("");
    const file = e.target.files[0];
    setCsvFile(file);
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      try {
        const rows = text.trim().split(/\r?\n/);
        const header = rows.shift();
        const cols = header.split(',').map((s) => s.trim().toLowerCase());
        const parsed = rows.map((row) => {
          const vals = row.split(',');
          const obj = {};
          cols.forEach((c, i) => (obj[c] = vals[i]?.trim() || ''));
          return obj;
        });
        setStudents(parsed);
        setSuccess("CSV parsed successfully. Preview below.");
      } catch (err) {
        setError(err.message);
        setStudents([]);
      }
    };
    reader.readAsText(file);
  };

  const handleUpload = async () => {
    if (!csvFile) return;
    setError("");
    setSuccess("");
    try {
      const res = await api.uploadStudentsCsv(csvFile);
      setUploadResult(res);
      setSuccess(`Uploaded ${res.count} records`);
    } catch (err) {
      setError(err.message);
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
                    {Object.keys(students[0]).map((k) => (
                      <th
                        key={k}
                        className="py-3 px-6 border-b text-left text-sm font-semibold text-gray-800"
                      >
                        {k.charAt(0).toUpperCase() + k.slice(1)}
                      </th>
                    ))}
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
                      {Object.keys(students[0]).map((k) => (
                        <td
                          key={k}
                          className="py-3 px-6 border-b text-sm text-gray-700"
                        >
                          {student[k]}
                        </td>
                      ))}
                    </motion.tr>
                  ))}
                </tbody>
              </table>
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: "0 10px 20px -5px rgba(59, 130, 246, 0.3)" }}
                whileTap={{ scale: 0.95 }}
                onClick={handleUpload}
                className="mt-6 w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white p-3 rounded-xl font-semibold hover:from-blue-600 hover:to-purple-600 transition-all duration-200 shadow-md"
              >
                Upload to Server
              </motion.button>
              <AnimatePresence>
                {uploadResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="mt-4 text-sm text-gray-600 text-center"
                  >
                    {uploadResult.count} records processed.
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