gimport { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../utils/api";
import { CheckCircle, AlertCircle, Award, Calendar, User, Lock, ExternalLink, Copy } from "lucide-react";

export default function FeedbackForm() {
  const { pairId } = useParams();
  const navigate = useNavigate();
  const [pair, setPair] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [notification, setNotification] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);

  const [ratings, setRatings] = useState({
    integrity: 3,
    communication: 3,
    preparedness: 3,
    problemSolving: 3,
    attitude: 3,
  });
  const [suggestions, setSuggestions] = useState("");

  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;

  // Block navigation/reload until submitted using beforeunload
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!submitted) {
        e.preventDefault();
        e.returnValue = 'You have unsaved feedback. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [submitted]);

  useEffect(() => {
    console.log('[FeedbackForm] Component mounted, pairId:', pairId);
    
    const loadPairDetails = async () => {
      try {
        setLoading(true);
        console.log('[FeedbackForm] Fetching pair details for:', pairId);
        
        const data = await api.getPairDetails(pairId);
        console.log('[FeedbackForm] Pair data received:', data);
        setPair(data);

        // Verify current user is the interviewer
        const interviewerId = data.interviewer?._id || data.interviewer;
        console.log('[FeedbackForm] User verification:', { userId, interviewerId, match: String(interviewerId) === String(userId) });
        
        if (!userId || String(interviewerId) !== String(userId)) {
          console.log('[FeedbackForm] User is not the interviewer');
          setError("Only the mentor can submit feedback for this session.");
          return;
        }

        // Check if feedback already submitted
        try {
          const existingFeedback = await api.myFeedback(data.event._id);
          console.log('[FeedbackForm] Existing feedback check:', existingFeedback);
          if (existingFeedback.some(f => f.pair === pairId)) {
            setSubmitted(true);
            setNotification("Feedback already submitted for this session.");
          }
        } catch (err) {
          console.log('[FeedbackForm] Could not check existing feedback:', err);
        }
      } catch (err) {
        console.error('[FeedbackForm] Error loading pair details:', err);
        setError(err.message || "Failed to load session details");
      } finally {
        setLoading(false);
        console.log('[FeedbackForm] Loading complete');
      }
    };

    loadPairDetails();
  }, [pairId, userId]);

  const totalMarks =
    ratings.integrity +
    ratings.communication +
    ratings.preparedness +
    ratings.problemSolving +
    ratings.attitude;

  const handleCopyLink = async () => {
    if (pair?.meetingLink) {
      try {
        await navigator.clipboard.writeText(pair.meetingLink);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || submitted) return;

    try {
      setSubmitting(true);
      await api.submitFeedback(pairId, ratings, suggestions);
      setSubmitted(true);
      setNotification("✅ Feedback submitted successfully!");
      
      // Set flag to trigger immediate refresh on dashboard
      try {
        localStorage.setItem('feedbackJustSubmitted', 'true');
        localStorage.removeItem(`feedbackTimer:${pairId}`);
      } catch {
        // ignore
      }

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate("/student/dashboard");
      }, 2000);
    } catch (err) {
      setNotification(err.message || "Failed to submit feedback");
      setSubmitting(false);
    }
  };

  if (loading) {
    console.log('[FeedbackForm] Showing loading state');
    return (
      <div className="h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center overflow-hidden">
        <div className="text-center bg-white p-6 rounded-lg shadow-lg">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600 mx-auto mb-3"></div>
          <p className="text-sm text-slate-600 font-medium">Loading session details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    console.log('[FeedbackForm] Showing error state:', error);
    return (
      <div className="h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center overflow-hidden px-4">
        <div className="bg-white rounded-lg border border-red-200 p-6 max-w-md shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <h2 className="text-base font-semibold text-slate-900">Error</h2>
          </div>
          <p className="text-sm text-slate-700 mb-4">{error}</p>
          <button
            onClick={() => navigate("/student/dashboard")}
            className="w-full px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white text-sm rounded-lg font-medium transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!pair) {
    console.log('[FeedbackForm] No pair data, returning null');
    return (
      <div className="h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center overflow-hidden">
        <div className="text-center bg-white p-6 rounded-lg shadow-lg">
          <p className="text-sm text-slate-600 font-medium mb-3">No session data available</p>
          <button
            onClick={() => navigate("/student/dashboard")}
            className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white text-sm rounded-lg font-medium transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  console.log('[FeedbackForm] Rendering feedback form for pair:', pair._id);
  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 to-indigo-50 overflow-hidden flex items-center justify-center">
      <div className="w-full max-w-6xl px-4 py-3">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-slate-200 p-4 shadow-lg">
          {/* Meeting Link Section */}
          {pair?.meetingLink && (
            <div className="mb-3 p-3 bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200 rounded-lg">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <ExternalLink className="w-4 h-4 text-sky-600" />
                    <span className="text-xs font-semibold text-sky-900">Meeting Link</span>
                  </div>
                  <a
                    href={pair.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-sky-700 hover:text-sky-900 underline break-all font-medium"
                  >
                    {pair.meetingLink}
                  </a>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copySuccess ? "Copied!" : "Copy"}
                  </button>
                  <a
                    href={pair.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Join
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Compact Header with Session Details */}
          <div className="mb-2 pb-2 border-b border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                {!submitted && <Lock className="w-4 h-4 text-sky-600" />}
                Interview Feedback Form
              </h1>
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <span className="font-semibold text-slate-600">Event:</span>
                <span className="ml-1 text-slate-900">{pair.event?.name || "N/A"}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-600">Date:</span>
                <span className="ml-1 text-slate-900">
                  {pair.event?.startDate ? new Date(pair.event.startDate).toLocaleDateString() : "N/A"}
                </span>
              </div>
              <div>
                <span className="font-semibold text-slate-600">Candidate:</span>
                <span className="ml-1 text-slate-900">
                  {pair.interviewee?.name || pair.interviewee?.email || "N/A"}
                </span>
              </div>
            </div>
          </div>

          {/* Evaluation Criteria */}
          <div className="mb-2">
            <h2 className="text-sm font-semibold text-slate-900 mb-2">
              Evaluation Criteria
            </h2>

            {/* Ratings Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left p-2 border border-slate-200 font-semibold text-slate-700 text-xs">
                      Evaluation Point
                    </th>
                    <th className="text-center p-2 border border-slate-200 font-semibold text-slate-700 text-xs" colSpan="5">
                      Rating (1 = Poor, 5 = Excellent)
                    </th>
                  </tr>
                  <tr className="bg-slate-50">
                    <th className="p-2 border border-slate-200"></th>
                    {[1, 2, 3, 4, 5].map((num) => (
                      <th key={num} className="text-center p-1 border border-slate-200 text-xs text-slate-600">
                        {num}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { key: "integrity", label: "Integrity and Ethical Behavior" },
                    { key: "communication", label: "Communication Skills" },
                    { key: "preparedness", label: "Preparedness and Initiative" },
                    { key: "problemSolving", label: "Problem Solving and Learning Ability" },
                    { key: "attitude", label: "Attitude and Respect" },
                  ].map((criterion, idx) => (
                    <tr key={criterion.key} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                      <td className="p-2 border border-slate-200 font-medium text-slate-800 text-xs">
                        {criterion.label}
                      </td>
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <td key={rating} className="text-center p-1.5 border border-slate-200">
                          <input
                            type="radio"
                            name={criterion.key}
                            value={rating}
                            checked={ratings[criterion.key] === rating}
                            onChange={() =>
                              setRatings((prev) => ({ ...prev, [criterion.key]: rating }))
                            }
                            disabled={submitted}
                            className="w-3.5 h-3.5 text-sky-600 focus:ring-sky-500 cursor-pointer disabled:cursor-not-allowed"
                            required
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="bg-sky-50 font-semibold">
                    <td className="p-2 border border-slate-200 text-slate-900 text-xs">
                      Total Marks
                    </td>
                    <td colSpan="5" className="text-center p-2 border border-slate-200 text-sky-700 text-sm">
                      {totalMarks} / 25
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Suggestions */}
            <div className="mt-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Additional Suggestions (Optional)
              </label>
              <textarea
                value={suggestions}
                onChange={(e) => setSuggestions(e.target.value)}
                disabled={submitted}
                rows={2}
                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-sky-500 focus:border-sky-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                placeholder="Share any additional feedback or suggestions..."
              />
            </div>
          </div>

          {/* Notification */}
          {notification && (
            <div
              className={`mb-3 p-2 rounded-lg flex items-center gap-2 ${
                notification.includes("✅") || notification.includes("success")
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                  : "bg-red-50 border border-red-200 text-red-800"
              }`}
            >
              {notification.includes("✅") || notification.includes("success") ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              <p className="text-xs font-medium">{notification}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || submitted}
            className="w-full px-4 py-2 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white text-sm font-semibold rounded-lg transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Submitting...
              </>
            ) : submitted ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Submitted Successfully
              </>
            ) : (
              "Submit Feedback"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
