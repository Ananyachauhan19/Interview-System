import { useState } from "react";

// Demo event data
const demoEvents = [
  {
    id: 1,
    title: "Mock Interview Day",
    description: "Practice your interview skills with industry experts.",
    date: "2025-10-10",
    joinedStudents: ["alice@example.com", "bob@example.com"],
  },
  {
    id: 2,
    title: "Resume Workshop",
    description: "Get feedback on your resume from recruiters.",
    date: "2025-10-15",
    joinedStudents: ["carol@example.com"],
  },
];

export default function StudentDashboard() {
  const [events, setEvents] = useState(demoEvents);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [studentEmail, setStudentEmail] = useState("");
  const [joinSuccess, setJoinSuccess] = useState("");

  // Show event details
  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setJoinSuccess("");
  };

  // Register student for event (frontend only)
  const handleJoinEvent = () => {
    if (!studentEmail) return;
    if (selectedEvent.joinedStudents.includes(studentEmail)) {
      setJoinSuccess("You have already joined this event.");
      return;
    }
    const updatedEvents = events.map((ev) =>
      ev.id === selectedEvent.id
        ? { ...ev, joinedStudents: [...ev.joinedStudents, studentEmail] }
        : ev
    );
    setEvents(updatedEvents);
    setSelectedEvent({
      ...selectedEvent,
      joinedStudents: [...selectedEvent.joinedStudents, studentEmail],
    });
    setJoinSuccess("Successfully joined the event!");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-2xl w-full mx-auto">
        <h2 className="text-3xl font-extrabold mb-4 text-blue-700 text-center tracking-tight">Student Dashboard</h2>
        {!selectedEvent ? (
          <div>
            <h3 className="font-semibold mb-4 text-lg text-gray-700">Available Events:</h3>
            <ul className="divide-y divide-gray-200">
              {events.map((event) => (
                <li key={event.id} className="py-4 cursor-pointer hover:bg-blue-50 rounded-xl px-4 transition" onClick={() => handleEventClick(event)}>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-lg text-blue-700">{event.title}</span>
                    <span className="text-gray-500 text-sm">{event.date}</span>
                  </div>
                  <div className="text-gray-500 text-sm mt-1">{event.description}</div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div>
            <button className="mb-4 text-blue-600 hover:underline font-semibold" onClick={() => setSelectedEvent(null)}>
              ← Back to Events
            </button>
            <h3 className="text-2xl font-bold mb-2 text-blue-700">{selectedEvent.title}</h3>
            <div className="mb-2 text-gray-500">Date: {selectedEvent.date}</div>
            <div className="mb-4 text-gray-700">{selectedEvent.description}</div>
            <div className="mb-4 flex flex-col md:flex-row items-center gap-2">
              <input
                type="email"
                placeholder="Your Email"
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value)}
                className="border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-blue-400 focus:outline-none text-lg w-full md:w-auto"
              />
              <button
                onClick={handleJoinEvent}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition text-lg w-full md:w-auto"
              >
                Join Event
              </button>
            </div>
            {joinSuccess && <div className="text-green-600 mt-2 text-center">{joinSuccess}</div>}
            <div className="mt-6">
              <h4 className="font-semibold mb-2 text-lg text-gray-700">Students Joined:</h4>
              <ul className="list-disc ml-6">
                {selectedEvent.joinedStudents.map((email, idx) => (
                  <li key={idx} className="text-gray-700 text-base">{email}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
