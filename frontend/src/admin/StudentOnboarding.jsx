import { useState } from "react";
import { api } from "../utils/api";

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
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-10 w-full">
        <h2 className="text-3xl font-extrabold mb-4 text-blue-700 text-center tracking-tight">Student Onboarding</h2>
        <p className="mb-6 text-gray-500 text-center">Upload a CSV file with student credentials (name, email, password).</p>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="mb-4 block w-full text-gray-700 border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-400"
        />
        {error && <div className="text-red-500 mb-2 text-center">{error}</div>}
        {success && <div className="text-green-600 mb-2 text-center">{success}</div>}
        {students.length > 0 && (
          <div className="overflow-x-auto mt-4">
            <table className="min-w-full border border-gray-200 rounded-xl">
              <thead>
                <tr className="bg-gray-100">
                  {Object.keys(students[0]).map((k) => (
                    <th key={k} className="py-3 px-6 border-b text-left">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((student, idx) => (
                  <tr key={idx} className="text-left">
                    {Object.keys(students[0]).map((k) => (
                      <td key={k} className="py-2 px-6 border-b">{student[k]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={handleUpload} className="mt-4 w-full bg-green-600 text-white p-3 rounded-xl font-bold hover:bg-green-700">Upload to Server</button>
            {uploadResult && (
              <div className="mt-2 text-sm text-gray-600">{uploadResult.count} processed.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
