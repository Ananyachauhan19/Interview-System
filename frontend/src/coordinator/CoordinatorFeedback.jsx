/* eslint-disable no-unused-vars */
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
    className="bg-white rounded-lg border border-slate-200 p-3 space-y-2"
  >
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <h3 className="font-semibold text-slate-800 text-sm">{feedback.event}</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          {new Date(feedback.submittedAt).toLocaleString()}
        </p>
      </div>
      <div className="flex items-center gap-1 bg-sky-50 px-1.5 py-0.5 rounded">
        <Star className="w-3 h-3 text-sky-500" />
        <span className="text-xs font-semibold text-sky-700">{feedback.marks}</span>
      </div>
    </div>

    <div className="grid grid-cols-1 gap-1.5 text-sm">
      <div className="flex items-center gap-1.5">
        <User className="w-3 h-3 text-emerald-500" />
        <div>
          <div className="text-xs text-slate-500">Mentor</div>
          <div className="font-medium text-slate-800 text-sm">{feedback.interviewer}</div>
        </div>
      </div>
      
      <div className="flex items-center gap-1.5">
        <Users className="w-3 h-3 text-indigo-500" />
        <div>
          <div className="text-xs text-slate-500">Candidate</div>
          <div className="font-medium text-slate-800 text-sm">{feedback.interviewee}</div>
        </div>
      </div>

      {feedback.intervieweeCollege && (
        <div className="flex items-center gap-1.5">
          <School className="w-3 h-3 text-amber-500" />
          <div>
            <div className="text-xs text-slate-500">College</div>
            <div className="font-medium text-slate-800 text-sm">{feedback.intervieweeCollege}</div>
          </div>
        </div>
      )}
    </div>

    {feedback.comments && (
      <div className="bg-slate-50 rounded p-2">
        <div className="flex items-center gap-1.5 mb-1">
          <MessageSquare className="w-3 h-3 text-slate-500" />
          <div className="text-xs font-semibold text-slate-600">Comments</div>
        </div>
        <p className="text-sm text-slate-700 line-clamp-2">{feedback.comments}</p>
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
      className="bg-sky-50 rounded-lg border border-sky-200 p-4 mb-4"
    >
      <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-1.5 text-sm">
        <Filter className="w-4 h-4 text-sky-600" />
        Filter Feedback
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Event
            </label>
            <select 
              value={eventId} 
              onChange={(e) => setEventId(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-700 text-sm focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
            >
              <option value="">All Events</option>
              {events.map(ev => (
                <option key={ev._id} value={ev._id}>{ev.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Candidate College
            </label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-slate-500" />
              <input 
                value={localCollege}
                onChange={(e) => setLocalCollege(e.target.value)}
                placeholder="Search by college name..."
                className="w-full bg-white border border-slate-300 rounded-lg pl-7 pr-7 py-2 text-slate-700 text-sm focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
              />
              {localCollege && (
                <button
                  type="button"
                  onClick={() => setLocalCollege('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-700"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="submit"
            className="px-3 py-1.5 bg-sky-500 text-white rounded-lg font-medium text-sm flex items-center gap-1 hover:bg-sky-600 transition-colors"
          >
            <Filter className="w-3 h-3" />
            Apply Filters
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg font-medium text-sm hover:bg-slate-200 transition-colors"
          >
            Reset
          </button>

          <button
            type="button"
            onClick={onReload}
            disabled={loading}
            className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium text-sm flex items-center gap-1 hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Loading...' : 'Refresh'}
          </button>

          <button
            type="button"
            onClick={onDownload}
            className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg font-medium text-sm flex items-center gap-1 hover:bg-emerald-600 transition-colors ml-auto"
          >
            <Download className="w-3 h-3" />
            Export CSV
          </button>
        </div>
      </form>
    </motion.div>
  );
};

// Main Component
export default function CoordinatorFeedback() {
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
      const list = await api.listCoordinatorFeedback(qs.toString());
      setFeedback(list);
      setMsg(list.length ? '' : 'No feedback records found for your assigned students');
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
      const csv = await api.exportCoordinatorFeedbackCsv(qs.toString());
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; 
      a.download = `coordinator_feedback_${new Date().toISOString().split('T')[0]}.csv`; 
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
    <div className="min-h-screen bg-slate-50 flex flex-col pt-16">
      <div className="flex-1 w-full mx-auto px-4 py-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-sky-600 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-800">Student Feedback</h1>
                <p className="text-slate-600 text-sm">Review feedback for your assigned students</p>
              </div>
            </div>
            
            {/* Stats */}
            <div className="flex gap-3">
              <div className="text-center">
                <div className="text-lg font-semibold text-sky-600">{stats.total}</div>
                <div className="text-xs text-slate-500">Total</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-emerald-600">{stats.averageScore}</div>
                <div className="text-xs text-slate-500">Avg Score</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-indigo-600">{stats.uniqueColleges}</div>
                <div className="text-xs text-slate-500">Colleges</div>
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
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className={`p-2 rounded-lg mb-3 text-sm ${
                msg.includes('success') 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                  : 'bg-sky-50 text-sky-700 border border-sky-200'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <FileText className="w-3 h-3" />
                {msg}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <RefreshCw className="w-6 h-6 text-sky-500 animate-spin" />
          </div>
        ) : (
          <>
            {/* Mobile View - Cards */}
            <div className="lg:hidden space-y-2">
              {feedback.length === 0 ? (
                <div className="text-center py-8 text-slate-500 bg-white rounded-lg border border-slate-300">
                  <GraduationCap className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm">No feedback records found</p>
                  <p className="text-xs mt-0.5">Try adjusting your filters</p>
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
                className="bg-white rounded-lg border border-slate-200 overflow-hidden"
              >
                {feedback.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <GraduationCap className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm">No feedback records found for your assigned students</p>
                    <p className="text-xs mt-0.5">Try adjusting your search filters</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            Event
                          </th>
                          <th className="py-2 px-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            Mentor
                          </th>
                          <th className="p-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            Candidate
                          </th>
                          <th className="py-2 px-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            College
                          </th>
                          <th className="py-2 px-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            Marks
                          </th>
                          <th className="py-2 px-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            Comments
                          </th>
                          <th className="py-2 px-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            Submitted
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {feedback.map((f, index) => (
                          <motion.tr
                            key={f.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: index * 0.05 }}
                            className="hover:bg-slate-50 transition-colors"
                          >
                            <td className="py-2 px-3 text-sm font-medium text-slate-900">
                              {f.event}
                            </td>
                            <td className="py-2 px-3 text-sm text-slate-700">
                              {f.interviewer}
                            </td>
                            <td className="py-2 px-3 text-sm text-slate-700">
                              {f.interviewee}
                            </td>
                            <td className="py-2 px-3 text-sm text-slate-700">
                              {f.intervieweeCollege || '-'}
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-1">
                                <Star className="w-3 h-3 text-amber-500" />
                                <span className="text-sm font-semibold text-slate-800">
                                  {f.marks}
                                </span>
                              </div>
                            </td>
                            <td className="py-2 px-3 text-sm text-slate-700 max-w-xs">
                              <div className="line-clamp-2">{f.comments}</div>
                            </td>
                            <td className="py-2 px-3 text-sm text-slate-500">
                              {new Date(f.submittedAt).toLocaleDateString()}
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
