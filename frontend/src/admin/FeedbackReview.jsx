import { useEffect, useState, useCallback } from 'react';
import { api } from '../utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Filter, 
  RefreshCw, 
  GraduationCap, 
  Download, 
  Search,
  User,
  Users,
  FileText,
  Calendar,
  School,
  Star,
  MessageSquare,
  X
} from 'lucide-react';

// Feedback Card Component for Mobile
const FeedbackCard = ({ feedback }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white rounded-xl border border-gray-200 p-4 space-y-3"
  >
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <h3 className="font-semibold text-gray-800 text-sm">{feedback.event}</h3>
        <p className="text-xs text-gray-500 mt-1">
          {new Date(feedback.submittedAt).toLocaleString()}
        </p>
      </div>
      <div className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-full">
        <Star className="w-3 h-3 text-blue-500" />
        <span className="text-xs font-semibold text-blue-700">{feedback.marks}</span>
      </div>
    </div>

    <div className="grid grid-cols-1 gap-2 text-sm">
      <div className="flex items-center gap-2">
        <User className="w-4 h-4 text-green-500" />
        <div>
          <div className="text-xs text-gray-500">Interviewer</div>
          <div className="font-medium text-gray-800">{feedback.interviewer}</div>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-purple-500" />
        <div>
          <div className="text-xs text-gray-500">Interviewee</div>
          <div className="font-medium text-gray-800">{feedback.interviewee}</div>
        </div>
      </div>

      {feedback.intervieweeCollege && (
        <div className="flex items-center gap-2">
          <School className="w-4 h-4 text-orange-500" />
          <div>
            <div className="text-xs text-gray-500">College</div>
            <div className="font-medium text-gray-800">{feedback.intervieweeCollege}</div>
          </div>
        </div>
      )}
    </div>

    {feedback.comments && (
      <div className="bg-gray-50 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-1">
          <MessageSquare className="w-4 h-4 text-gray-500" />
          <div className="text-xs font-semibold text-gray-600">Comments</div>
        </div>
        <p className="text-sm text-gray-700 line-clamp-3">{feedback.comments}</p>
      </div>
    )}
  </motion.div>
);

// Filter Section Component
const FilterSection = ({ 
  events, 
  eventId, 
  setEventId, 
  college, 
  setCollege, 
  loading, 
  onApplyFilters, 
  onReset, 
  onReload, 
  onDownload 
}) => {
  const [localCollege, setLocalCollege] = useState(college);

  const handleSubmit = (e) => {
    e.preventDefault();
    setCollege(localCollege);
    onApplyFilters();
  };

  const handleReset = () => {
    setLocalCollege('');
    setEventId('');
    onReset();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-6 mb-6"
    >
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <Filter className="w-5 h-5 text-blue-500" />
        Filter Feedback
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event
            </label>
            <select 
              value={eventId} 
              onChange={(e) => setEventId(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            >
              <option value="">All Events</option>
              {events.map(ev => (
                <option key={ev._id} value={ev._id}>{ev.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Interviewee College
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input 
                value={localCollege}
                onChange={(e) => setLocalCollege(e.target.value)}
                placeholder="Search by college name..."
                className="w-full bg-white border border-gray-300 rounded-xl pl-10 pr-4 py-3 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
              {localCollege && (
                <button
                  type="button"
                  onClick={() => setLocalCollege('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <motion.button
            type="submit"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-6 py-3 bg-blue-500 text-white rounded-xl font-semibold flex items-center gap-2 hover:bg-blue-600 transition-all"
          >
            <Filter className="w-4 h-4" />
            Apply Filters
          </motion.button>

          <motion.button
            type="button"
            onClick={handleReset}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all"
          >
            Reset
          </motion.button>

          <motion.button
            type="button"
            onClick={onReload}
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-semibold flex items-center gap-2 hover:bg-gray-50 disabled:opacity-50 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Loading...' : 'Refresh'}
          </motion.button>

          <motion.button
            type="button"
            onClick={onDownload}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-6 py-3 bg-green-500 text-white rounded-xl font-semibold flex items-center gap-2 hover:bg-green-600 transition-all ml-auto"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </motion.button>
        </div>
      </form>
    </motion.div>
  );
};

// Main Component
export default function FeedbackReview() {
  const [feedback, setFeedback] = useState([]);
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState('');
  const [college, setCollege] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const loadEvents = async () => {
    try { 
      const ev = await api.listEvents(); 
      setEvents(ev); 
    } catch (error) {
      console.error('Failed to load events:', error);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (eventId) qs.set('eventId', eventId);
      if (college) qs.set('college', college.trim());
      const list = await api.listFeedback(qs.toString());
      setFeedback(list);
      setMsg(list.length ? '' : 'No feedback records found');
    } catch (e) {
      setMsg(e.message || 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  }, [eventId, college]);

  useEffect(() => { 
    loadEvents(); 
  }, []);

  useEffect(() => { 
    load(); 
  }, [load]);

  const applyFilters = (e) => { 
    if (e) e.preventDefault(); 
    load(); 
  };

  const reset = () => { 
    setEventId(''); 
    setCollege(''); 
    setTimeout(load, 0); 
  };

  const downloadCsv = async () => {
    try {
      const qs = new URLSearchParams();
      if (eventId) qs.set('eventId', eventId);
      if (college) qs.set('college', college.trim());
      const csv = await api.exportFilteredFeedbackCsv(qs.toString());
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; 
      a.download = `feedback_${new Date().toISOString().split('T')[0]}.csv`; 
      a.click();
      URL.revokeObjectURL(url);
      setMsg('CSV exported successfully');
    } catch (e) { 
      setMsg(e.message || 'Failed to export CSV'); 
    }
  };

  const stats = {
    total: feedback.length,
    averageScore: feedback.length > 0 
      ? (feedback.reduce((sum, f) => sum + (parseFloat(f.marks) || 0), 0) / feedback.length).toFixed(1)
      : 0,
    uniqueColleges: new Set(feedback.filter(f => f.intervieweeCollege).map(f => f.intervieweeCollege)).size
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pt-16">
      <div className="flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-2xl">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">Feedback Review</h1>
                <p className="text-gray-600 mt-1">Review and analyze interview feedback</p>
              </div>
            </div>
            
            {/* Stats */}
            <div className="flex gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                <div className="text-xs text-gray-500">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.averageScore}</div>
                <div className="text-xs text-gray-500">Avg Score</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.uniqueColleges}</div>
                <div className="text-xs text-gray-500">Colleges</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <FilterSection
          events={events}
          eventId={eventId}
          setEventId={setEventId}
          college={college}
          setCollege={setCollege}
          loading={loading}
          onApplyFilters={applyFilters}
          onReset={reset}
          onReload={load}
          onDownload={downloadCsv}
        />

        {/* Message */}
        <AnimatePresence>
          {msg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-4 rounded-xl mb-6 ${
                msg.includes('success') 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {msg}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : (
          <>
            {/* Mobile View - Cards */}
            <div className="lg:hidden space-y-4">
              {feedback.length === 0 ? (
                <div className="text-center py-12 text-gray-500 bg-white rounded-2xl border border-gray-200">
                  <GraduationCap className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p>No feedback records found</p>
                  <p className="text-sm mt-1">Try adjusting your filters</p>
                </div>
              ) : (
                feedback.map((f, index) => (
                  <FeedbackCard key={f.id} feedback={f} index={index} />
                ))
              )}
            </div>

            {/* Desktop View - Table */}
            <div className="hidden lg:block">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
              >
                {feedback.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <GraduationCap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg">No feedback records found</p>
                    <p className="text-sm mt-1">Try adjusting your search filters</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="py-4 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Event
                          </th>
                          <th className="py-4 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Interviewer
                          </th>
                          <th className="py-4 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Interviewee
                          </th>
                          <th className="py-4 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            College
                          </th>
                          <th className="py-4 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Marks
                          </th>
                          <th className="py-4 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Comments
                          </th>
                          <th className="py-4 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Submitted
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {feedback.map((f, index) => (
                          <motion.tr
                            key={f.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: index * 0.05 }}
                            className="hover:bg-gray-50 transition-colors"
                          >
                            <td className="py-4 px-6 text-sm font-medium text-gray-900">
                              {f.event}
                            </td>
                            <td className="py-4 px-6 text-sm text-gray-700">
                              {f.interviewer}
                            </td>
                            <td className="py-4 px-6 text-sm text-gray-700">
                              {f.interviewee}
                            </td>
                            <td className="py-4 px-6 text-sm text-gray-700">
                              {f.intervieweeCollege || '-'}
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 text-yellow-500" />
                                <span className="text-sm font-semibold text-gray-800">
                                  {f.marks}
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-6 text-sm text-gray-700 max-w-xs">
                              <div className="line-clamp-2">{f.comments}</div>
                            </td>
                            <td className="py-4 px-6 text-sm text-gray-500">
                              {new Date(f.submittedAt).toLocaleString()}
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </motion.div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}