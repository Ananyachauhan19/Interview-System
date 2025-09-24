import { useState } from "react";

const emailTemplate = ({ title, description, date }) => `
Subject: New Event - ${title}

Dear Student,

We are excited to announce a new event:

Title: ${title}
Date: ${date}
Description: ${description}

Please mark your calendar and stay tuned for more details!

Best regards,
Interview Management Team
`;

export default function EventManagement() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [preview, setPreview] = useState("");
  const [students, setStudents] = useState([]); // For demo, you can fill with sample emails
  const [sent, setSent] = useState(false);

  // Demo: Load students from local onboarding preview
  // In real app, fetch from backend
  // useEffect(() => { setStudents([...]); }, []);

  const handleCreateEvent = (e) => {
    e.preventDefault();
    if (!title || !description || !date) return;
    setPreview(emailTemplate({ title, description, date }));
    setSent(false);
  };

  const handleSendEmail = () => {
    // Frontend only: Simulate sending email
    setSent(true);
    // In real app, call backend API to send email to all students
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-xl w-full mx-auto">
        <h2 className="text-3xl font-extrabold mb-4 text-blue-700 text-center tracking-tight">Event Management</h2>
        <form onSubmit={handleCreateEvent} className="mb-8">
          <input
            type="text"
            placeholder="Event Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-gray-300 p-4 mb-4 rounded-xl focus:ring-2 focus:ring-blue-400 focus:outline-none text-lg"
            required
          />
          <textarea
            placeholder="Event Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border border-gray-300 p-4 mb-4 rounded-xl focus:ring-2 focus:ring-blue-400 focus:outline-none text-lg"
            required
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border border-gray-300 p-4 mb-4 rounded-xl focus:ring-2 focus:ring-blue-400 focus:outline-none text-lg"
            required
          />
          <button
            type="submit"
            className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition text-lg"
          >
            Create Event & Preview Email
          </button>
        </form>
        {preview && (
          <div className="mb-4">
            <h3 className="font-semibold mb-2">Email Preview:</h3>
            <pre className="bg-gray-100 p-4 rounded-xl text-sm whitespace-pre-wrap">{preview}</pre>
            <button
              onClick={handleSendEmail}
              className="mt-2 w-full bg-green-600 text-white p-4 rounded-xl font-bold hover:bg-green-700 transition text-lg"
            >
              Send Email to All Students
            </button>
            {sent && (
              <div className="text-green-600 mt-2 text-center">Email sent to all registered students (simulated).</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
