import { useState, useEffect } from "react";

// Demo session data
const demoSessions = [
  {
    id: 1,
    participants: ["alice@example.com", "bob@example.com"],
    time: "2025-10-10T10:00",
    meetingLink: "",
    feedbackSent: false,
    feedback: {},
  },
];

const feedbackQuestions = [
  "How useful was the session?",
  "How would you rate your partner?",
  "Any suggestions for improvement?",
];

function generateMeetingLink(sessionId) {
  return `https://meet.example.com/session/${sessionId}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function SessionAndFeedback() {
  const [sessions, setSessions] = useState(demoSessions);
  const [now, setNow] = useState(new Date());
  const [activeFeedback, setActiveFeedback] = useState(null);
  const [feedbackAnswers, setFeedbackAnswers] = useState({});
  const [notification, setNotification] = useState("");

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Simulate scheduled meeting link and feedback
  useEffect(() => {
    sessions.forEach((session, idx) => {
      const sessionTime = new Date(session.time);
      const fiveMinBefore = new Date(sessionTime.getTime() - 5 * 60000);
      // Meeting link notification
      if (
        !session.meetingLink &&
        now >= fiveMinBefore &&
        now < sessionTime
      ) {
        const link = generateMeetingLink(session.id);
        setSessions((prev) => {
          const updated = [...prev];
          updated[idx].meetingLink = link;
          return updated;
        });
        setNotification(
          `Meeting link generated for session ${session.id}: ${link} (sent to ${session.participants.join(", ")})`
        );
      }
      // Feedback notification
      if (
        session.meetingLink &&
        !session.feedbackSent &&
        now > sessionTime
      ) {
        setSessions((prev) => {
          const updated = [...prev];
          updated[idx].feedbackSent = true;
          return updated;
        });
        setNotification(
          `Feedback form sent to ${session.participants.join(", ")} for session ${session.id}`
        );
        setActiveFeedback(session.id);
      }
    });
  }, [now, sessions]);

  // Handle feedback form submission
  const handleFeedbackSubmit = (sessionId) => {
    setSessions((prev) => {
      const updated = prev.map((s) =>
        s.id === sessionId ? { ...s, feedback: feedbackAnswers } : s
      );
      return updated;
    });
    setActiveFeedback(null);
    setFeedbackAnswers({});
    setNotification("Thank you for your feedback!");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-2xl w-full mx-auto">
        <h2 className="text-3xl font-extrabold mb-4 text-blue-700 text-center tracking-tight">Session & Feedback</h2>
        {notification && (
          <div className="mb-6 text-green-600 font-bold text-center">{notification}</div>
        )}
        <h3 className="font-semibold mb-4 text-lg text-gray-700">Scheduled Sessions:</h3>
        <ul className="divide-y divide-gray-200 mb-8">
          {sessions.map((session) => (
            <li key={session.id} className="py-4">
              <div>
                <span className="font-bold text-blue-700">Session {session.id}</span> <br />
                <span className="text-gray-500">Time: {session.time.replace("T", " ")}</span> <br />
                <span className="text-gray-500">Participants: {session.participants.join(", ")}</span>
              </div>
              {session.meetingLink && (
                <div className="mt-2">
                  <span className="text-blue-600 font-semibold">Meeting Link: </span>
                  <a href={session.meetingLink} className="text-blue-600 underline font-semibold" target="_blank" rel="noopener noreferrer">
                    {session.meetingLink}
                  </a>
                </div>
              )}
              {session.feedbackSent && (
                <div className="mt-2 text-green-600 font-semibold">Feedback form sent.</div>
              )}
            </li>
          ))}
        </ul>
        {activeFeedback && (
          <div className="bg-gray-50 p-8 rounded-xl">
            <h3 className="font-semibold mb-4 text-lg text-blue-700">Session Feedback</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleFeedbackSubmit(activeFeedback);
              }}
            >
              {feedbackQuestions.map((q, idx) => (
                <div key={idx} className="mb-6">
                  <label className="block mb-2 font-semibold text-gray-700">{q}</label>
                  <input
                    type="text"
                    value={feedbackAnswers[q] || ""}
                    onChange={(e) =>
                      setFeedbackAnswers((prev) => ({ ...prev, [q]: e.target.value }))
                    }
                    className="w-full border border-gray-300 p-4 rounded-xl focus:ring-2 focus:ring-blue-400 focus:outline-none text-lg"
                    required
                  />
                </div>
              ))}
              <button
                type="submit"
                className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition text-lg"
              >
                Submit Feedback
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
