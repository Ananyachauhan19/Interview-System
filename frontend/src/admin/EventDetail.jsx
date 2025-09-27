import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../utils/api';
import { CheckCircle, AlertCircle, Upload, ArrowLeft, Download, Trash2, RefreshCw, Clock, Users } from 'lucide-react';

export default function EventDetail() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [pairs, setPairs] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [reloadingTemplateUrl, setReloadingTemplateUrl] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [ev, an, pr] = await Promise.all([
        api.getEvent(id),
        api.getEventAnalytics(id),
        api.listPairs(id),
      ]);
      setEvent(ev);
      setAnalytics(an);
      setPairs(pr);
    } catch (e) {
      setMsg(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleGeneratePairs = async () => {
    try {
      await api.generatePairs(id);
      setMsg('Pairs generated successfully');
      load();
    } catch (e) {
      setMsg(e.message);
    }
  };

  const handleExportCsv = async () => {
    try {
      const csv = await api.exportParticipantsCsv(id);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `participants_${id}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg('CSV exported successfully');
    } catch (e) {
      setMsg(e.message);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!window.confirm('Delete template? This cannot be undone.')) return;
    try {
      await api.deleteEventTemplate(id);
      setMsg('Template deleted successfully');
      load();
    } catch (e) {
      setMsg(e.message);
    }
  };

  const refreshSignedUrl = async () => {
    if (!event?.templateKey) return;
    try {
      setReloadingTemplateUrl(true);
      const { templateUrl } = await api.getEventTemplateUrl(id);
      setEvent((prev) => ({ ...prev, templateUrl }));
      setMsg('Signed URL refreshed successfully');
    } catch (e) {
      setMsg(e.message);
    } finally {
      setReloadingTemplateUrl(false);
    }
  };

  const handleReplaceTemplate = async (file) => {
    try {
      const updated = await api.updateEventTemplate(id, file);
      setEvent(updated);
      setMsg('Template updated successfully');
    } catch (e) {
      setMsg(e.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-16">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-gray-600 text-lg"
        >
          Loading...
        </motion.div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-16">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-red-600 text-lg"
        >
          Event not found
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pt-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex-1 w-full mx-auto px-4 sm:px-6 md:px-8 py-6"
      >
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 md:p-8">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex-1"
            >
              <h2 className="text-3xl font-bold text-gray-800 mb-4">{event.name}</h2>
              <p className="text-gray-600 text-base leading-relaxed mb-4 max-w-xl">{event.description}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
                  <Clock className="w-5 h-5 text-blue-500" />
                  <div>
                    <div className="text-sm text-gray-500">Start Time</div>
                    <div className="font-medium text-gray-800">
                      {event.startDate ? new Date(event.startDate).toLocaleString() : 'N/A'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
                  <Clock className="w-5 h-5 text-purple-500" />
                  <div>
                    <div className="text-sm text-gray-500">End Time</div>
                    <div className="font-medium text-gray-800">
                      {event.endDate ? new Date(event.endDate).toLocaleString() : 'N/A'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
                  <Users className="w-5 h-5 text-green-500" />
                  <div>
                    <div className="text-sm text-gray-500">Participants</div>
                    <div className="font-medium text-gray-800">{event.participantCount}</div>
                  </div>
                </div>
              </div>
              {analytics && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 mb-6"
                >
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Analytics</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    {[
                      { label: 'Joined', value: analytics.joined },
                      { label: 'Pairs', value: analytics.pairs },
                      { label: 'Scheduled', value: analytics.scheduled },
                      { label: 'Feedback', value: analytics.feedbackSubmissions },
                      { label: 'Avg Score', value: analytics.averageScore, colSpan: 'col-span-2 md:col-span-1' },
                    ].map((stat, idx) => (
                      <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4 + idx * 0.1 }}
                        className={`p-3 bg-white rounded-xl shadow-sm border border-gray-100 ${stat.colSpan || ''}`}
                      >
                        <div className="text-gray-500 text-xs">{stat.label}</div>
                        <div className="font-medium text-gray-800">{stat.value}</div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col gap-3 items-end"
            >
              <Link
                to="/admin/event"
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm underline"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Events
              </Link>
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: "0 10px 20px -5px rgba(59, 130, 246, 0.3)" }}
                whileTap={{ scale: 0.95 }}
                onClick={handleGeneratePairs}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-xl font-semibold text-sm hover:from-green-600 hover:to-emerald-600 transition-all duration-200 shadow-md"
              >
                Generate Pairs
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: "0 10px 20px -5px rgba(59, 130, 246, 0.3)" }}
                whileTap={{ scale: 0.95 }}
                onClick={handleExportCsv}
                className="w-full bg-gradient-to-r from-gray-600 to-gray-800 text-white px-4 py-2 rounded-xl font-semibold text-sm hover:from-gray-700 hover:to-gray-900 transition-all duration-200 shadow-md"
              >
                <Download className="w-4 h-4 mr-2 inline" />
                Export CSV
              </motion.button>
              <label className="w-full bg-gray-50 border border-gray-200 px-4 py-2 rounded-xl text-sm cursor-pointer hover:bg-gray-100 transition-all duration-200 flex items-center justify-center gap-2">
                <Upload className="w-4 h-4 text-blue-500" />
                Replace Template
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleReplaceTemplate(f);
                    e.target.value = '';
                  }}
                />
              </label>
              {event.templateUrl && (
                <a
                  href={event.templateUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  View Template{event.templateName ? `: ${event.templateName}` : ''}
                </a>
              )}
              {!event.ended && event.templateUrl && (
                <div className="text-xs text-gray-500 text-right">
                  Template deletable after event ends
                </div>
              )}
              {event.canDeleteTemplate && (
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: "0 10px 20px -5px rgba(239, 68, 68, 0.3)" }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleDeleteTemplate}
                  className="w-full bg-gradient-to-r from-red-500 to-rose-500 text-white px-4 py-2 rounded-xl font-semibold text-sm hover:from-red-600 hover:to-rose-600 transition-all duration-200 shadow-md"
                >
                  <Trash2 className="w-4 h-4 mr-2 inline" />
                  Delete Template
                </motion.button>
              )}
              {event.templateKey && import.meta.env.VITE_SUPABASE_PUBLIC !== 'true' && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={reloadingTemplateUrl}
                  onClick={refreshSignedUrl}
                  className="text-sm text-purple-600 hover:text-purple-800 underline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 inline ${reloadingTemplateUrl ? 'animate-spin' : ''}`} />
                  Refresh Signed URL
                </motion.button>
              )}
            </motion.div>
          </div>
          <AnimatePresence>
            {msg && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className={`flex items-center justify-center text-sm text-center p-4 rounded-xl mt-4 ${
                  msg.toLowerCase().includes('success')
                    ? 'bg-green-50 text-green-600 border border-green-100'
                    : 'bg-red-50 text-red-600 border border-red-100'
                }`}
              >
                {msg.toLowerCase().includes('success') ? (
                  <CheckCircle className="w-5 h-5 mr-2" />
                ) : (
                  <AlertCircle className="w-5 h-5 mr-2" />
                )}
                {msg}
              </motion.div>
            )}
          </AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-8"
          >
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Pairs</h3>
            {pairs.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-gray-500 text-sm text-center"
              >
                No pairs yet.
              </motion.div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent pr-2">
                {pairs.map((p, idx) => (
                  <motion.div
                    key={p._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + idx * 0.1 }}
                    className="p-4 rounded-xl bg-white shadow-sm border border-gray-100 hover:bg-gray-50 transition-all duration-200"
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-blue-700">
                          {p.interviewer?.name || p.interviewer?.email}
                        </span>
                        <span className="text-gray-400">→</span>
                        <span className="font-semibold text-pink-700">
                          {p.interviewee?.name || p.interviewee?.email}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                        <span>Status: {p.status || (p.scheduledAt ? 'Scheduled' : 'Pending')}</span>
                        {p.scheduledAt && (
                          <span>Time: {new Date(p.scheduledAt).toLocaleString()}</span>
                        )}
                        {p.meetingLink && (
                          <a
                            href={p.meetingLink}
                            className="text-blue-600 hover:text-blue-800 underline"
                            target="_blank"
                            rel="noreferrer"
                          >
                            Meeting Link
                          </a>
                        )}
                        {p.rejectionCount > 0 && (
                          <span className="text-red-600">Rejections: {p.rejectionCount}</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}