import { useState } from "react";

export default function StudentOnboarding() {
  const [csvFile, setCsvFile] = useState(null);
  const [students, setStudents] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
        const parsed = rows.map((row, idx) => {
          const [name, email, password] = row.split(",");
          if (!name || !email || !password) throw new Error(`Invalid CSV format at line ${idx + 1}`);
          return { name: name.trim(), email: email.trim(), password: password.trim() };
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-xl w-full mx-auto">
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
                  <th className="py-3 px-6 border-b text-left">Name</th>
                  <th className="py-3 px-6 border-b text-left">Email</th>
                  <th className="py-3 px-6 border-b text-left">Password</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, idx) => (
                  <tr key={idx} className="text-left">
                    <td className="py-2 px-6 border-b">{student.name}</td>
                    <td className="py-2 px-6 border-b">{student.email}</td>
                    <td className="py-2 px-6 border-b">{student.password}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
