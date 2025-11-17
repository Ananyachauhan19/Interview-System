
import { useState, useEffect } from "react";
import { api } from "../utils/api";
import { motion } from "framer-motion";
import { 
  Calendar, 
  User, 
  Star, 
  MessageSquare, 
  Award,
  CheckCircle,
  Clock,
  Mail
} from "lucide-react";

export default function SessionAndFeedback() {
  const [feedbackList, setFeedbackList] = useState([]);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFeedback = async () => {
      try {
        setLoading(true);
        // Get all feedback received by the user
        const allFeedback = await api.feedbackForMe();
        console.log('Feedback received:', allFeedback);
        setFeedbackList(allFeedback);
        if (allFeedback.length > 0) {
          setSelectedFeedback(allFeedback[0]);
        }
      } catch (err) {
        console.error('Failed to load feedback:', err);
      } finally {
        setLoading(false);
      }
    };
    loadFeedback();
  }, []);

  const criteriaLabels = {
    integrity: "Integrity and Ethical Behavior",
    communication: "Communication Skills",
    preparedness: "Preparedness and Initiative",
    problemSolving: "Problem Solving and Learning Ability",
    attitude: "Attitude and Respect"
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center pt-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your feedback...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 pt-20 pb-8">
      <div className="container mx-auto px-4 h-[calc(100vh-7rem)]">
        <div className="flex gap-6 h-full">
          {/* Left Sidebar - Event List */}
          <div className="w-80 bg-white rounded-xl shadow-lg p-4 overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Award className="w-6 h-6 text-blue-600" />
              Feedback Received
            </h2>
            
            {feedbackList.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No feedback received yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {feedbackList.map((feedback, idx) => (
                  <motion.div
                    key={feedback.pair || idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => setSelectedFeedback(feedback)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedFeedback?.pair === feedback.pair
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <h3 className="font-semibold text-gray-800 text-sm">
                        {feedback.event?.name || feedback.event?.title || "Event"}
                      </h3>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                      <User className="w-3 h-3" />
                      <span>From: {feedback.from}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="text-sm font-bold text-gray-700">
                          {feedback.totalMarks ? `${feedback.totalMarks}/25` : `${feedback.marks}%`}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {feedback.submittedAt 
                          ? new Date(feedback.submittedAt).toLocaleDateString()
                          : ""}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Right Side - Feedback Details */}
          <div className="flex-1 bg-white rounded-xl shadow-lg p-6 overflow-y-auto">
            {!selectedFeedback ? (
              <div className="h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p>Select a feedback to view details</p>
                </div>
              </div>
            ) : (
              <motion.div
                key={selectedFeedback.pair}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                {/* Header */}
                <div className="border-b border-gray-200 pb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                      <Award className="w-7 h-7 text-blue-600" />
                      Interview Feedback
                    </h1>
                    <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">Received</span>
                    </div>
                  </div>
                </div>

                {/* Event Details Card */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-5 border border-blue-200">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    Event Details
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">Event Name</p>
                      <p className="text-sm text-gray-900 font-medium">
                        {selectedFeedback.event?.name || selectedFeedback.event?.title || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">Event Date</p>
                      <p className="text-sm text-gray-900 font-medium">
                        {selectedFeedback.event?.dateTime || selectedFeedback.event?.startDate
                          ? new Date(selectedFeedback.event.dateTime || selectedFeedback.event.startDate).toLocaleDateString("en-US", {
                              weekday: "short",
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">Interviewer</p>
                      <p className="text-sm text-gray-900 font-medium">{selectedFeedback.from}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">Feedback Submitted</p>
                      <p className="text-sm text-gray-900 font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {selectedFeedback.submittedAt
                          ? new Date(selectedFeedback.submittedAt).toLocaleString()
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Evaluation Results */}
                {selectedFeedback.totalMarks && (
                  <div className="bg-white rounded-lg border border-gray-200 p-5">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <Star className="w-5 h-5 text-yellow-500" />
                      Evaluation Criteria
                    </h2>
                    
                    <div className="space-y-3 mb-5">
                      {Object.entries(criteriaLabels).map(([key, label]) => {
                        const value = selectedFeedback[key];
                        if (!value) return null;
                        return (
                          <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm font-medium text-gray-700">{label}</span>
                            <div className="flex items-center gap-2">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-4 h-4 ${
                                    star <= value
                                      ? "text-yellow-500 fill-yellow-500"
                                      : "text-gray-300"
                                  }`}
                                />
                              ))}
                              <span className="text-sm font-bold text-gray-700 ml-2 min-w-[2rem]">
                                {value}/5
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg p-4 border-2 border-blue-300">
                      <div className="flex items-center justify-between">
                        <span className="text-base font-bold text-gray-800">Total Score</span>
                        <div className="flex items-center gap-2">
                          <Award className="w-6 h-6 text-blue-600" />
                          <span className="text-2xl font-bold text-blue-700">
                            {selectedFeedback.totalMarks} / 25
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Overall Marks (fallback for old format) */}
                {!selectedFeedback.totalMarks && selectedFeedback.marks != null && (
                  <div className="bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg p-5 border-2 border-blue-300">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-gray-800">Overall Score</span>
                      <div className="flex items-center gap-2">
                        <Award className="w-7 h-7 text-blue-600" />
                        <span className="text-3xl font-bold text-blue-700">
                          {selectedFeedback.marks}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Comments/Suggestions */}
                {(selectedFeedback.suggestions || selectedFeedback.comments) && (
                  <div className="bg-white rounded-lg border border-gray-200 p-5">
                    <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-blue-600" />
                      Additional Feedback
                    </h2>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {selectedFeedback.suggestions || selectedFeedback.comments}
                      </p>
                    </div>
                  </div>
                )}

                {/* Contact Info */}
                {selectedFeedback.fromEmail && (
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <p className="text-xs text-gray-600 mb-1">Need to follow up?</p>
                    <div className="flex items-center gap-2 text-sm text-blue-700">
                      <Mail className="w-4 h-4" />
                      <span className="font-medium">{selectedFeedback.fromEmail}</span>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}