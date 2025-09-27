
import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../utils/api';
import { CheckCircle, AlertCircle, Upload, ArrowLeft, Download, Trash2, RefreshCw, Clock, Users, Search, Calendar, X, Menu } from 'lucide-react';

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [events, setEvents] = useState([]);
  const [activeEventId, setActiveEventId] = useState(id);
  const [searchQuery, setSearchQuery] = useState("");
  const [pairs, setPairs] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [reloadingTemplateUrl, setReloadingTemplateUrl] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const load = useCallback(async (eventId) => {
    try {
      setLoading(true);
      setMsg('');
      const [allEvents] = await Promise.all([api.listEvents()]);
      setEvents(allEvents);

      // If no eventId provided or invalid, try to select the first event
      let targetEventId = eventId || id;
      if (!targetEventId && allEvents.length > 0) {
        targetEventId = allEvents[0]._id;
        setActiveEventId(targetEventId);
        navigate(`/admin/event/${targetEventId}`, { replace: true });
      }

      if (targetEventId) {
        const [ev, an, pr] = await Promise.all([
          api.getEvent(targetEventId),
          api.getEventAnalytics(targetEventId),
          api.listPairs(targetEventId),
        ]);
        setEvent(ev);
        setAnalytics(an);
        setPairs(pr);
      } else {
        setEvent(null);
        setAnalytics(null);
        setPairs([]);
        setMsg('No events available. Please create an event first.');
      }
    } catch (e) {
      setMsg(e.message || 'Failed to load event data');
      setEvent(null);
      setAnalytics(null);
      setPairs([]);
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    load(activeEventId);
  }, [activeEventId, load]);

  const handleGeneratePairs = async () => {
    try {
      await api.generatePairs(activeEventId);
      setMsg('Pairs generated successfully');
      load(activeEventId);
    } catch (e) {
      setMsg(e.message);
    }
  };

  const handleExportCsv = async () => {
    try {
      const csv = await api.exportParticipantsCsv(activeEventId);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `participants_${activeEventId}.csv`;
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
      await api.deleteEventTemplate(activeEventId);
      setMsg('Template deleted successfully');
      load(activeEventId);
    } catch (e) {
      setMsg(e.message);
    }
  };

  const refreshSignedUrl = async () => {
    if (!event?.templateKey) return;
    try {
      setReloadingTemplateUrl(true);
      const { templateUrl } = await api.getEventTemplateUrl(activeEventId);
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
      const updated = await api.updateEventTemplate(activeEventId, file);
      setEvent(updated);
      setMsg('Template updated successfully');
    } catch (e) {
      setMsg(e.message);
    }
  };

  const handleEventSelect = (eventId) => {
    setActiveEventId(eventId);
    navigate(`/admin/event/${eventId}`);
    setIsMobileSidebarOpen(false);
  };

  const filteredEvents = events.filter(e =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pt-16">
      <div className="flex-1 w-full max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] gap-6">
          {/* Desktop Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="hidden lg:block lg:w-80"
          >
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Events</h2>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search events..."
                  className="w-full bg-gray-50 border border-gray-200 pl-10 pr-10 py-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-700 text-sm"
                />
                {searchQuery && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-4 h-4" />
                  </motion.button>
                )}
              </div>
              {filteredEvents.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-gray-600 text-sm text-center py-8"
                >
                  No events found
                </motion.div>
              ) : (
                <div className="space-y-4">
                  {filteredEvents.map((e, idx) => (
                    <motion.div
                      key={e._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + idx * 0.1 }}
                      className={`p-4 rounded-xl bg-white shadow-sm border border-gray-100 hover:bg-gray-50 transition-all duration-200 cursor-pointer ${
                        activeEventId === e._id ? "ring-2 ring-blue-500" : ""
                      }`}
                      onClick={() => handleEventSelect(e._id)}
                    >
                      <div className="flex items-start gap-3">
                        <Calendar className="w-5 h-5 text-blue-500 mt-1" />
                        <div className="flex-1">
                          <p className="font-bold text-gray-800 bg-blue-50 px-2 py-1 rounded-md">{e.name}</p>
                          <p className="text-sm text-gray-600 mt-1">
                            {new Date(e.startDate).toLocaleString()} → {new Date(e.endDate).toLocaleString()}
                          </p>
                          <div className="flex gap-2 mt-2 flex-wrap">
                            {e.isSpecial && (
                              <span className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded-full">
                                Special
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Mobile Sidebar Toggle */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:hidden sticky top-16 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-100 py-4 px-4 flex items-center justify-between"
          >
            <h2 className="text-xl font-bold text-gray-800">Events</h2>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all duration-200"
            >
              {isMobileSidebarOpen ? <X className="w-5 h-5 text-gray-600" /> : <Menu className="w-5 h-5 text-blue-500" />}
            </motion.button>
          </motion.div>

          {/* Mobile Sidebar Overlay */}
          <AnimatePresence>
            {isMobileSidebarOpen && (
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="lg:hidden fixed inset-0 top-28 z-30 bg-white p-6 overflow-y-auto"
              >
                <div className="space-y-4">
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search events..."
                      className="w-full bg-gray-50 border border-gray-200 pl-10 pr-10 py-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-700 text-sm"
                    />
                    {searchQuery && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        <X className="w-4 h-4" />
                      </motion.button>
                    )}
                  </div>
                  {filteredEvents.length === 0 ? (
                    <div className="text-gray-600 text-sm text-center py-8">No events found</div>
                  ) : (
                    filteredEvents.map((e) => (
                      <motion.div
                        key={e._id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="p-4 rounded-xl bg-white shadow-sm border border-gray-100 hover:bg-gray-50 transition-all duration-200 cursor-pointer"
                        onClick={() => handleEventSelect(e._id)}
                      >
                        <div className="flex items-start gap-3">
                          <Calendar className="w-5 h-5 text-blue-500 mt-1" />
                          <div className="flex-1">
                            <p className="font-bold text-gray-800 bg-blue-50 px-2 py-1 rounded-md">{e.name}</p>
                            <p className="text-sm text-gray-600 mt-1">
                              {new Date(e.startDate).toLocaleString()} → {new Date(e.endDate).toLocaleString()}
                            </p>
                            <div className="flex gap-2 mt-2 flex-wrap">
                              {e.isSpecial && (
                                <span className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded-full">
                                  Special
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex-1"
          >
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 md:p-8 lg:p-10 h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
              {event ? (
                <div className="space-y-6">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex items-center justify-between"
                  >
                    <h2 className="text-2xl lg:text-3xl font-bold text-gray-800">{event.name}</h2>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setIsMobileSidebarOpen(true)}
                      className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all duration-200 lg:hidden"
                    >
                      <Menu className="w-5 h-5 text-gray-600" />
                    </motion.button>
                  </motion.div>
                  <p className="text-gray-600 text-sm">{event.description}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
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
                  <div className="flex flex-col gap-3 mb-6">
                    <Link
                      to="/admin/event"
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm underline"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back to Event Creation
                    </Link>
                    <motion.button
                      whileHover={{ scale: 1.05, boxShadow: "0 10px 20px -5px rgba(59, 130, 246, 0.3)" }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleGeneratePairs}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-3 rounded-xl font-semibold text-sm hover:from-green-600 hover:to-emerald-600 transition-all duration-200 shadow-md"
                    >
                      Generate Pairs
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05, boxShadow: "0 10px 20px -5px rgba(59, 130, 246, 0.3)" }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleExportCsv}
                      className="w-full bg-gradient-to-r from-gray-600 to-gray-800 text-white px-4 py-3 rounded-xl font-semibold text-sm hover:from-gray-700 hover:to-gray-900 transition-all duration-200 shadow-md"
                    >
                      <Download className="w-4 h-4 mr-2 inline" />
                      Export CSV
                    </motion.button>
                    <label className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl text-sm cursor-pointer hover:bg-gray-100 transition-all duration-200 flex items-center justify-center gap-2">
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
                        className="text-sm text-blue-600 hover:text-blue-800 underline text-center"
                      >
                        View Template{event.templateName ? `: ${event.templateName}` : ''}
                      </a>
                    )}
                    {!event.ended && event.templateUrl && (
                      <div className="text-xs text-gray-500 text-center">
                        Template deletable after event ends
                      </div>
                    )}
                    {event.canDeleteTemplate && (
                      <motion.button
                        whileHover={{ scale: 1.05, boxShadow: "0 10px 20px -5px rgba(239, 68, 68, 0.3)" }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleDeleteTemplate}
                        className="w-full bg-gradient-to-r from-red-500 to-rose-500 text-white px-4 py-3 rounded-xl font-semibold text-sm hover:from-red-600 hover:to-rose-600 transition-all duration-200 shadow-md"
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
                        className="text-sm text-purple-600 hover:text-purple-800 underline disabled:opacity-50 disabled:cursor-not-allowed text-center"
                      >
                        <RefreshCw className={`w-4 h-4 mr-2 inline ${reloadingTemplateUrl ? 'animate-spin' : ''}`} />
                        Refresh Signed URL
                      </motion.button>
                    )}
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
                  <AnimatePresence>
                    {msg && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className={`flex items-center justify-center text-sm text-center p-4 rounded-xl mt-6 ${
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
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="flex flex-col items-center justify-center h-full text-center"
                >
                  <Calendar className="w-16 h-16 text-blue-500 mb-4" />
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">No Event Available</h3>
                  <p className="text-gray-600 max-w-md">
                    {msg || 'No events are available. Please create an event in Event Management.'}
                    {msg ? (
                      <Link to="/admin/event" className="text-blue-600 hover:text-blue-800 underline mt-2 inline-block">
                        Go to Event Management
                      </Link>
                    ) : null}
                  </p>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}