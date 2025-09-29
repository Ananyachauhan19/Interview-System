import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../utils/api';
import { 
  CheckCircle, 
  AlertCircle, 
  Upload, 
  ArrowLeft, 
  Download, 
  Trash2, 
  RefreshCw, 
  Clock, 
  Users, 
  Search, 
  Calendar, 
  X, 
  Menu,
  FileText,
  BarChart3,
  Link2
} from 'lucide-react';

// Event Card Component
const EventCard = ({ event, isActive, onClick }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className={`p-4 rounded-xl bg-white shadow-sm border transition-all duration-200 cursor-pointer ${
      isActive 
        ? "border-blue-500 ring-2 ring-blue-500 ring-opacity-20 bg-blue-50" 
        : "border-gray-100 hover:border-gray-300 hover:bg-gray-50"
    }`}
    onClick={onClick}
  >
    <div className="flex items-start gap-3">
      <Calendar className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-gray-800 truncate">{event.name}</h3>
        <div className="text-sm text-gray-600 mt-1 space-y-1">
          <p>Start: {new Date(event.startDate).toLocaleDateString()}</p>
          <p>End: {new Date(event.endDate).toLocaleDateString()}</p>
        </div>
        {event.isSpecial && (
          <span className="inline-block mt-2 text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded-full">
            Special Event
          </span>
        )}
      </div>
    </div>
  </motion.div>
);

// Stat Card Component
const StatCard = ({ icon: Icon, label, value, color = "blue" }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    className="p-4 bg-white rounded-xl shadow-sm border border-gray-100"
  >
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg bg-${color}-50`}>
        <Icon className={`w-4 h-4 text-${color}-500`} />
      </div>
      <div>
        <div className="text-sm text-gray-500">{label}</div>
        <div className="font-semibold text-gray-800">{value}</div>
      </div>
    </div>
  </motion.div>
);

// Pair Card Component
const PairCard = ({ pair, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.5 + index * 0.1 }}
    className="p-4 rounded-xl bg-white shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200"
  >
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="text-center min-w-0 flex-1">
            <div className="font-semibold text-blue-700 truncate">
              {pair.interviewer?.name || pair.interviewer?.email}
            </div>
            <div className="text-xs text-gray-500">Interviewer</div>
          </div>
          
          <div className="text-gray-400 flex-shrink-0">→</div>
          
          <div className="text-center min-w-0 flex-1">
            <div className="font-semibold text-pink-700 truncate">
              {pair.interviewee?.name || pair.interviewee?.email}
            </div>
            <div className="text-xs text-gray-500">Interviewee</div>
          </div>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-3 text-xs text-gray-600 border-t pt-3">
        <span className={`px-2 py-1 rounded-full ${
          pair.status === 'completed' ? 'bg-green-100 text-green-700' :
          pair.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          {pair.status || (pair.scheduledAt ? 'Scheduled' : 'Pending')}
        </span>
        
        {pair.scheduledAt && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(pair.scheduledAt).toLocaleString()}
          </span>
        )}
        
        {pair.meetingLink && (
          <a
            href={pair.meetingLink}
            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 underline"
            target="_blank"
            rel="noreferrer"
          >
            <Link2 className="w-3 h-3" />
            Meeting Link
          </a>
        )}
        
        {pair.rejectionCount > 0 && (
          <span className="text-red-600">Rejections: {pair.rejectionCount}</span>
        )}
      </div>
    </div>
  </motion.div>
);

// Search and Filter Component
const EventSearchFilter = ({ searchQuery, setSearchQuery, eventTab, setEventTab }) => (
  <div className="space-y-4">
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search events..."
        className="w-full bg-gray-50 border border-gray-200 pl-10 pr-10 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-gray-700 text-sm"
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
    
    <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
      {['all', 'active', 'upcoming', 'previous'].map(tab => (
        <button
          key={tab}
          onClick={() => setEventTab(tab)}
          className={`flex-1 px-3 py-2 rounded-md text-xs font-semibold transition-all duration-200 ${
            eventTab === tab
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          {tab.charAt(0).toUpperCase() + tab.slice(1)}
        </button>
      ))}
    </div>
  </div>
);

// Main Component
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
  const [eventTab, setEventTab] = useState('all');

  const load = useCallback(async (eventId) => {
    try {
      setLoading(true);
      setMsg('');
      const [allEvents] = await Promise.all([api.listEvents()]);
      setEvents(allEvents);

      let targetEventId = eventId || id;
      const isValidObjectId = (val) => /^[0-9a-fA-F]{24}$/.test(val || '');
      
      if (!targetEventId || targetEventId.startsWith(':') || !isValidObjectId(targetEventId)) {
        targetEventId = '';
      }

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

  // Filter events based on tab and search
  const now = new Date();
  const filteredEvents = events.filter(e => {
    const nameMatch = e.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!nameMatch) return false;
    if (eventTab === 'all') return true;
    if (eventTab === 'active') return new Date(e.startDate) <= now && new Date(e.endDate) >= now;
    if (eventTab === 'upcoming') return new Date(e.startDate) > now;
    if (eventTab === 'previous') return new Date(e.endDate) < now;
    return true;
  });

  // Action handlers
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
    if (!window.confirm('Are you sure you want to delete this template? This action cannot be undone.')) return;
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
      <div className="flex-1 w-full max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Mobile Header */}
          <div className="lg:hidden flex items-center justify-between bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <h1 className="text-xl font-bold text-gray-800">Event Management</h1>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              className="p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all duration-200"
            >
              {isMobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </motion.button>
          </div>

          {/* Sidebar */}
          <AnimatePresence>
            {(isMobileSidebarOpen || window.innerWidth >= 1024) && (
              <motion.div
                initial={{ x: window.innerWidth < 1024 ? "-100%" : 0 }}
                animate={{ x: 0 }}
                exit={{ x: window.innerWidth < 1024 ? "-100%" : 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className={`lg:block lg:w-80 ${
                  window.innerWidth < 1024 
                    ? "fixed inset-0 top-16 z-30 bg-white p-6 overflow-y-auto" 
                    : "relative"
                }`}
              >
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-full overflow-y-auto">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">Events</h2>
                  
                  <EventSearchFilter 
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    eventTab={eventTab}
                    setEventTab={setEventTab}
                  />

                  <div className="mt-4 space-y-3">
                    {filteredEvents.length === 0 ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-gray-500 text-sm text-center py-8"
                      >
                        No events found
                      </motion.div>
                    ) : (
                      filteredEvents.map((e, idx) => (
                        <EventCard
                          key={e._id}
                          event={e}
                          isActive={activeEventId === e._id}
                          onClick={() => handleEventSelect(e._id)}
                        />
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-full">
              {event ? (
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <h1 className="text-2xl font-bold text-gray-800">{event.name}</h1>
                      <p className="text-gray-600 mt-1">{event.description}</p>
                    </div>
                    <Link
                      to="/admin/event"
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back to Events
                    </Link>
                  </div>

                  {/* Event Controls */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-100">
                      <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-yellow-600" />
                        Event Access Control
                      </h3>
                      <div className="space-y-3 text-sm">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={!!event.joinDisabled}
                            onChange={async (e) => {
                              try {
                                const updated = await api.updateEventJoinDisable(event._id, e.target.checked, null);
                                setEvent(updated);
                                setMsg(e.target.checked ? 'Event closed' : 'Event opened');
                              } catch (err) {
                                setMsg(err.message || 'Failed to update event status');
                              }
                            }}
                            className="rounded text-blue-500"
                          />
                          <span>Close event registration</span>
                        </label>
                        
                        <div className="flex items-center gap-2">
                          <span>Auto-close at:</span>
                          <input
                            type="datetime-local"
                            value={event.joinDisableTime ? new Date(event.joinDisableTime).toISOString().slice(0,16) : ''}
                            disabled={!!event.joinDisabled}
                            onChange={async (e) => {
                              try {
                                const updated = await api.updateEventJoinDisable(event._id, false, e.target.value);
                                setEvent(updated);
                                setMsg('Auto-close time set');
                              } catch (err) {
                                setMsg(err.message || 'Failed to update auto-close time');
                              }
                            }}
                            className="flex-1 bg-white border border-gray-200 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-yellow-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                      <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-600" />
                        Capacity Settings
                      </h3>
                      <div className="space-y-3 text-sm">
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="capacityType"
                              value="unlimited"
                              checked={event.capacity === null || event.capacity === ''}
                              onChange={() => setEvent(ev => ({ ...ev, capacity: null }))}
                              className="text-blue-500"
                            />
                            <span>Unlimited</span>
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="capacityType"
                              value="limited"
                              checked={event.capacity !== null && event.capacity !== ''}
                              onChange={() => setEvent(ev => ({ ...ev, capacity: 1 }))}
                              className="text-blue-500"
                            />
                            <span>Limited</span>
                          </label>
                        </div>
                        
                        {event.capacity !== null && event.capacity !== '' && (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="1"
                              value={event.capacity !== undefined ? String(event.capacity) : ''}
                              onChange={e => {
                                const val = e.target.value;
                                setEvent(ev => ({ ...ev, capacity: val === '' ? '' : Number(val) }));
                              }}
                              className="w-20 bg-white border border-gray-200 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                            <button
                              onClick={async () => {
                                try {
                                  const updated = await api.updateEventCapacity(event._id, event.capacity === '' ? null : event.capacity);
                                  setEvent(updated);
                                  setMsg('Capacity updated');
                                } catch (err) {
                                  setMsg(err.message || 'Failed to update capacity');
                                }
                              }}
                              className="px-3 py-1 bg-blue-500 text-white rounded text-sm font-medium hover:bg-blue-600 transition-all"
                            >
                              Update
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleGeneratePairs}
                      className="p-3 bg-green-500 text-white rounded-xl font-semibold text-sm hover:bg-green-600 transition-all duration-200 shadow-sm"
                    >
                      Generate Pairs
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleExportCsv}
                      className="p-3 bg-gray-600 text-white rounded-xl font-semibold text-sm hover:bg-gray-700 transition-all duration-200 shadow-sm flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Export CSV
                    </motion.button>
                    
                    <label className="p-3 bg-white border border-gray-200 rounded-xl text-sm cursor-pointer hover:bg-gray-50 transition-all duration-200 flex items-center justify-center gap-2">
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

                    {event.canDeleteTemplate && (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleDeleteTemplate}
                        className="p-3 bg-red-500 text-white rounded-xl font-semibold text-sm hover:bg-red-600 transition-all duration-200 shadow-sm flex items-center justify-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete Template
                      </motion.button>
                    )}
                  </div>

                  {/* Template Management */}
                  {event.templateUrl && (
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-600" />
                        Template Management
                      </h3>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-sm">
                        <a
                          href={event.templateUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          View Template{event.templateName ? `: ${event.templateName}` : ''}
                        </a>
                        
                        {event.templateKey && import.meta.env.VITE_SUPABASE_PUBLIC !== 'true' && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            disabled={reloadingTemplateUrl}
                            onClick={refreshSignedUrl}
                            className="text-purple-600 hover:text-purple-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                          >
                            <RefreshCw className={`w-4 h-4 ${reloadingTemplateUrl ? 'animate-spin' : ''}`} />
                            Refresh URL
                          </motion.button>
                        )}
                        
                        {!event.ended && (
                          <span className="text-xs text-gray-500">
                            Template can be deleted after event ends
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Analytics */}
                  {analytics && (
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-blue-500" />
                        Event Analytics
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                        <StatCard icon={Users} label="Joined" value={analytics.joined} color="blue" />
                        <StatCard icon={Link2} label="Pairs" value={analytics.pairs} color="green" />
                        <StatCard icon={Calendar} label="Scheduled" value={analytics.scheduled} color="purple" />
                        <StatCard icon={FileText} label="Feedback" value={analytics.feedbackSubmissions} color="orange" />
                        <StatCard icon={BarChart3} label="Avg Score" value={analytics.averageScore} color="red" />
                      </div>
                    </div>
                  )}

                  {/* Pairs Section */}
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-4">Interview Pairs</h3>
                    {pairs.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl border border-gray-200">
                        No pairs generated yet. Click "Generate Pairs" to create interview pairs.
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {pairs.map((pair, idx) => (
                          <PairCard key={pair._id} pair={pair} index={idx} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Calendar className="w-16 h-16 text-blue-500 mb-4" />
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">No Event Selected</h3>
                  <p className="text-gray-600 max-w-md mb-4">
                    {msg || 'Select an event from the sidebar or create a new event to get started.'}
                  </p>
                  <Link
                    to="/admin/event"
                    className="px-6 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-all duration-200"
                  >
                    Create New Event
                  </Link>
                </div>
              )}

              {/* Message Alert */}
              <AnimatePresence>
                {msg && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className={`flex items-center justify-center p-4 rounded-xl mt-6 ${
                      msg.toLowerCase().includes('success')
                        ? 'bg-green-50 text-green-600 border border-green-200'
                        : 'bg-red-50 text-red-600 border border-red-200'
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
          </div>
        </div>
      </div>
    </div>
  );
}