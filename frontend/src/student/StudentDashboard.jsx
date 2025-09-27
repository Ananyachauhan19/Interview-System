import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../utils/api";
import {
  CheckCircle, Clock, Calendar, Users, Info, Menu, X, ChevronRight,
  BookOpen, Award, TrendingUp, Bell, Search, Filter, Star, Zap,
  GraduationCap, Target, BarChart3, Rocket, Sparkles
} from "lucide-react";

export default function StudentDashboard() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [ackRead, setAckRead] = useState(false);
  const [joinMsg, setJoinMsg] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  useEffect(() => {
    api.listEvents().then(setEvents).catch(console.error);
  }, []);

  const handleEventClick = async (event) => {
    setSelectedEvent({ ...event });
    setJoinMsg("");
    setAckRead(false);
    setIsMobileMenuOpen(false);
    try {
      const res = await api.getEventTemplateUrl(event._id);
      if (res?.templateUrl) {
        setSelectedEvent((prev) => (prev ? { ...prev, templateUrl: res.templateUrl } : prev));
      }
    } catch (err) {
      // Ignore template fetch errors silently
    }
  };

  const handleJoinEvent = async () => {
    if (!selectedEvent) return;
    if (selectedEvent?.templateUrl && !ackRead) {
      setJoinMsg("Please confirm you have read the template.");
      return;
    }
    try {
      const res = await api.joinEvent(selectedEvent._id);
      setJoinMsg(res?.message || "Successfully joined the event!");
      setSelectedEvent((prev) => (prev ? { ...prev, joined: true } : prev));
      setEvents((prev) => prev.map((e) => (e._id === selectedEvent._id ? { ...e, joined: true } : e)));
    } catch (err) {
      setJoinMsg(err.message || "Failed to join the event.");
    }
  };

  const fmt = (d) => (d ? new Date(d).toLocaleString() : "TBD");

  // Filter events based on search and filter
  const filteredEvents = events.filter(event => {
    const matchesSearch = event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = activeFilter === "all" ? true :
                         activeFilter === "joined" ? event.joined :
                         activeFilter === "upcoming" ? new Date(event.startDate) > new Date() : true;
    
    return matchesSearch && matchesFilter;
  });

  const stats = {
    totalEvents: events.length,
    joinedEvents: events.filter(e => e.joined).length,
    upcomingEvents: events.filter(e => new Date(e.startDate) > new Date()).length,
    completedEvents: events.filter(e => new Date(e.endDate) < new Date()).length
  };

  return (
    <div className="min-h-screen w-full bg-white flex flex-col overflow-hidden mt-[5%]">
      {/* Mobile Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="lg:hidden fixed top-[5%] left-0 right-0 bg-white/95 backdrop-blur-xl border-b border-gray-100 z-50 px-4 py-3 flex items-center justify-between shadow-sm"
      >
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800">Student Dashboard</h1>
            <p className="text-xs text-gray-500">{stats.joinedEvents} events joined</p>
          </div>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all duration-200"
        >
          {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </motion.header>

      {/* Desktop Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="hidden lg:flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white"
      >
        <div className="flex items-center space-x-4">
          <motion.div
            whileHover={{ scale: 1.05, rotate: 5 }}
            className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl shadow-lg"
          >
            <GraduationCap className="w-6 h-6 text-white" />
          </motion.div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Student Learning Hub</h1>
            <p className="text-gray-600">Track and join exciting learning events</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <motion.div whileHover={{ scale: 1.02 }} className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="p-2 bg-gray-50 rounded-xl cursor-pointer"
          >
            <Bell className="w-5 h-5 text-gray-600" />
          </motion.div>
        </div>
      </motion.header>

      {/* Main Content Container */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 mt-16 lg:mt-0">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Desktop Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="hidden lg:block lg:col-span-1"
          >
            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 h-[calc(100vh-8rem)] flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800">Events</h2>
                <span className="px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full text-sm font-medium">
                  {filteredEvents.length}
                </span>
              </div>
              <div className="flex space-x-2 mb-6 p-1 bg-gray-50 rounded-xl">
                {["all", "upcoming", "joined"].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                      activeFilter === filter
                        ? "bg-white text-gray-800 shadow-sm"
                        : "text-gray-600 hover:text-gray-800"
                    }`}
                  >
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </button>
                ))}
              </div>
              <div className="lg:hidden relative mb-4">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search events..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-3 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent pr-2">
                {filteredEvents.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center text-gray-500 py-8"
                  >
                    <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No events found</p>
                  </motion.div>
                ) : (
                  filteredEvents.map((event, index) => {
                    const active = selectedEvent && selectedEvent._id === event._id;
                    return (
                      <motion.button
                        key={event._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        onClick={() => handleEventClick(event)}
                        whileHover={{ scale: 1.02, x: 4 }}
                        whileTap={{ scale: 0.98 }}
                        className={`w-full text-left p-4 rounded-2xl transition-all duration-300 border-2 ${
                          active
                            ? "border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-md"
                            : "border-transparent bg-gray-50/80 hover:border-gray-200 hover:bg-white"
                        } ${event.joined ? "ring-2 ring-green-200" : ""}`}
                      >
                        <div className="flex items-start space-x-3">
                          <motion.div
                            whileHover={{ scale: 1.1, rotate: 5 }}
                            className={`p-2 rounded-xl ${
                              event.joined
                                ? "bg-green-100 text-green-600"
                                : new Date(event.startDate) > new Date()
                                ? "bg-blue-100 text-blue-600"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {event.joined ? <CheckCircle size={16} /> : 
                             new Date(event.startDate) > new Date() ? <Zap size={16} /> : 
                             <Calendar size={16} />}
                          </motion.div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <h3 className="font-semibold text-gray-800 truncate">{event.name}</h3>
                              {event.joined && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="flex-shrink-0"
                                >
                                  <CheckCircle size={14} className="text-green-500" />
                                </motion.div>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{event.description}</p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                {fmt(event.startDate)}
                              </span>
                              <div className="flex items-center space-x-1 text-xs text-gray-500">
                                <Users size={12} />
                                <span>{event.capacity || "∞"}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })
                )}
              </div>
            </div>
          </motion.div>

          {/* Mobile Events Overlay */}
          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, x: -100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                className="lg:hidden fixed inset-0 top-[5%] z-40 bg-white/95 backdrop-blur-xl pt-20 px-4 pb-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800">Events</h2>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 rounded-xl bg-gray-100"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="flex space-x-2 mb-6 p-1 bg-gray-50 rounded-xl">
                  {["all", "upcoming", "joined"].map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setActiveFilter(filter)}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium ${
                        activeFilter === filter
                          ? "bg-white text-gray-800 shadow-sm"
                          : "text-gray-600"
                      }`}
                    >
                      {filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </button>
                  ))}
                </div>
                <div className="space-y-3 h-full overflow-y-auto pb-20">
                  {filteredEvents.map((event) => (
                    <motion.button
                      key={event._id}
                      onClick={() => handleEventClick(event)}
                      className="w-full text-left p-4 rounded-2xl bg-white border border-gray-200 hover:border-blue-300 transition-all duration-200 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-xl ${
                            event.joined ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"
                          }`}>
                            <Calendar size={16} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-800">{event.name}</h3>
                            <p className="text-sm text-gray-600">{fmt(event.startDate)}</p>
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-gray-400" />
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Content Area */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-3"
          >
            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 lg:p-8 h-[calc(100vh-8rem)] flex flex-col">
              {!selectedEvent ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="max-w-2xl"
                  >
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 0.4, type: "spring" }}
                      className="w-32 h-32 mx-auto mb-8 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-3xl flex items-center justify-center shadow-2xl"
                    >
                      <Rocket className="w-12 h-12 text-white" />
                    </motion.div>
                    <motion.h1
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="text-3xl lg:text-5xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-6"
                    >
                      Ready to Learn?
                    </motion.h1>
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                      className="text-gray-600 text-lg mb-12 max-w-md mx-auto"
                    >
                      Select an event from the sidebar to explore exciting learning opportunities and boost your skills.
                    </motion.p>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7 }}
                      className="grid grid-cols-2 lg:grid-cols-4 gap-4"
                    >
                      {[
                        { label: "Total Events", value: stats.totalEvents, icon: BookOpen, color: "blue" },
                        { label: "Joined", value: stats.joinedEvents, icon: CheckCircle, color: "green" },
                        { label: "Upcoming", value: stats.upcomingEvents, icon: TrendingUp, color: "purple" },
                        { label: "Completed", value: stats.completedEvents, icon: Award, color: "orange" }
                      ].map((stat, index) => (
                        <motion.div
                          key={stat.label}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.8 + index * 0.1 }}
                          whileHover={{ scale: 1.05, y: -2 }}
                          className={`bg-gradient-to-br from-${stat.color}-50 to-${stat.color}-100 rounded-2xl p-4 border border-${stat.color}-200 shadow-sm`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-2xl font-bold text-gray-800">{stat.value}</div>
                              <div className="text-sm text-gray-600">{stat.label}</div>
                            </div>
                            <div className={`p-2 bg-${stat.color}-500/10 rounded-lg`}>
                              <stat.icon className={`w-4 h-4 text-${stat.color}-600`} />
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  </motion.div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 mb-8"
                  >
                    <div className="flex-1">
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center space-x-3 mb-4"
                      >
                        {selectedEvent.joined && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="flex items-center space-x-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium"
                          >
                            <CheckCircle size={14} />
                            <span>Joined</span>
                          </motion.div>
                        )}
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                          {new Date(selectedEvent.startDate) > new Date() ? 'Upcoming' : 'Active'}
                        </span>
                      </motion.div>
                      <motion.h2
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-2xl lg:text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-4"
                      >
                        {selectedEvent.name}
                      </motion.h2>
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
                          <Clock className="w-5 h-5 text-blue-500" />
                          <div>
                            <div className="text-sm text-gray-500">Start Time</div>
                            <div className="font-medium text-gray-800">{fmt(selectedEvent.startDate)}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
                          <Clock className="w-5 h-5 text-purple-500" />
                          <div>
                            <div className="text-sm text-gray-500">End Time</div>
                            <div className="font-medium text-gray-800">{fmt(selectedEvent.endDate)}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
                          <Users className="w-5 h-5 text-green-500" />
                          <div>
                            <div className="text-sm text-gray-500">Capacity</div>
                            <div className="font-medium text-gray-800">{selectedEvent.capacity || "Unlimited"}</div>
                          </div>
                        </div>
                      </div>
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-gray-700 text-lg leading-relaxed bg-gray-50/50 p-4 rounded-xl"
                      >
                        {selectedEvent.description}
                      </motion.p>
                    </div>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-end gap-4"
                    >
                      {!selectedEvent.joined ? (
                        <motion.button
                          whileHover={{ scale: 1.05, boxShadow: "0 10px 30px -10px rgba(59, 130, 246, 0.5)" }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleJoinEvent}
                          disabled={selectedEvent.templateUrl && !ackRead}
                          className={`px-8 py-4 rounded-2xl font-semibold text-white shadow-lg transition-all duration-200 ${
                            selectedEvent.templateUrl && !ackRead
                              ? "bg-gray-400 cursor-not-allowed"
                              : "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                          }`}
                        >
                          <span>Join Event</span>
                        </motion.button>
                      ) : (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="flex items-center space-x-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold shadow-lg"
                        >
                          <CheckCircle size={20} />
                          <span>Successfully Joined</span>
                        </motion.div>
                      )}
                    </motion.div>
                  </motion.div>
                  {selectedEvent.templateUrl && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200 mb-6"
                    >
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="p-2 bg-blue-500 rounded-lg">
                          <Info className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="font-semibold text-gray-800 text-lg">Event Preparation</h3>
                      </div>
                      <p className="text-gray-700 mb-4">
                        Please review the event template to prepare for this session. This will help you get the most out of the learning experience.
                      </p>
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <label className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={ackRead}
                            onChange={(e) => setAckRead(e.target.checked)}
                            className="w-5 h-5 text-blue-500 rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-gray-700 font-medium">
                            I confirm that I have read and understood the event template
                          </span>
                        </label>
                        <motion.a
                          whileHover={{ scale: 1.05 }}
                          href={selectedEvent.templateUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-2 px-6 py-3 bg-white border border-blue-300 rounded-xl text-blue-600 hover:bg-blue-50 transition-all duration-200 font-medium shadow-sm"
                        >
                          <BookOpen size={18} />
                          <span>View Template Details</span>
                        </motion.a>
                      </div>
                    </motion.div>
                  )}
                  <AnimatePresence>
                    {joinMsg && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.9 }}
                        className={`p-4 rounded-2xl text-center font-medium ${
                          joinMsg.toLowerCase().includes("fail") || joinMsg.toLowerCase().includes("error")
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : "bg-green-50 text-green-700 border border-green-200"
                        }`}
                      >
                        <div className="flex items-center justify-center space-x-2">
                          {joinMsg.toLowerCase().includes("fail") || joinMsg.toLowerCase().includes("error") ? (
                            <X className="w-5 h-5" />
                          ) : (
                            <CheckCircle className="w-5 h-5" />
                          )}
                          <span>{joinMsg}</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
