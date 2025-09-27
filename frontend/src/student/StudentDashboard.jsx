import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../utils/api";
import {
  CheckCircle, Clock, Calendar, Users, Info, ChevronLeft,
  BookOpen, Award, X
} from "lucide-react";

export default function StudentDashboard() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [ackRead, setAckRead] = useState(false);
  const [joinMsg, setJoinMsg] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  useEffect(() => {
    api.listEvents().then(setEvents).catch(console.error);
  }, []);

  const handleEventClick = async (event) => {
    setSelectedEvent({ ...event });
    setJoinMsg("");
    setAckRead(false);
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

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = activeFilter === "all" ? true : activeFilter === "joined" ? event.joined : true;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    totalEvents: events.length,
    joinedEvents: events.filter(e => e.joined).length,
    completedEvents: events.filter(e => new Date(e.endDate) < new Date()).length
  };

  const StatsComponent = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7 }}
      className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8"
    >
      {[
        { label: "Total Events", value: stats.totalEvents, icon: BookOpen, color: "blue" },
        { label: "Joined", value: stats.joinedEvents, icon: CheckCircle, color: "green" },
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
  );

  const EventList = () => (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
      <div className="lg:hidden mb-6">
        <StatsComponent />
      </div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">Events</h2>
        <span className="px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full text-sm font-medium">
          {filteredEvents.length}
        </span>
      </div>
      <div className="flex space-x-2 mb-6 p-1 bg-gray-50 rounded-xl">
        {["all", "joined"].map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeFilter === filter
                ? "bg-white text-gray-800 shadow-sm"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            {filter.charAt(0).toUpperCase() + filter.slice(1)}
          </button>
        ))}
      </div>
      <div className="relative mb-6">
        <input
          type="text"
          placeholder="Search events..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      </div>
      <div className="space-y-4 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent pr-2">
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
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full text-left p-4 rounded-xl transition-all duration-300 border ${
                  active
                    ? "border-blue-300 bg-blue-50 shadow-md"
                    : "border-gray-100 bg-gray-50/50 hover:bg-white hover:border-gray-200"
                } ${event.joined ? "ring-1 ring-green-200" : ""}`}
              >
                <div className="flex items-start space-x-3">
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    className={`p-2 rounded-lg ${
                      event.joined ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"
                    }`}
                  >
                    {event.joined ? <CheckCircle size={16} /> : <Calendar size={16} />}
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-gray-800 truncate text-base">{event.name}</h3>
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
  );

  const EventDetails = () => (
    <div className="flex-1 flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="lg:hidden flex items-center space-x-3 mb-6 p-4 bg-white border-b border-gray-100 sticky top-0 z-10"
      >
        <button
          onClick={() => setSelectedEvent(null)}
          className="p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all"
        >
          <ChevronLeft size={20} className="text-gray-700" />
        </button>
        <h2 className="text-xl font-bold text-gray-800 truncate">{selectedEvent.name}</h2>
      </motion.div>
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
            className="hidden lg:block text-3xl font-bold text-gray-800 mb-4"
          >
            {selectedEvent.name}
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
            className="text-gray-700 text-base leading-relaxed bg-gray-50/50 p-4 rounded-xl"
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
              whileHover={{ scale: 1.05, boxShadow: "0 10px 20px -5px rgba(59, 130, 246, 0.3)" }}
              whileTap={{ scale: 0.95 }}
              onClick={handleJoinEvent}
              disabled={selectedEvent.templateUrl && !ackRead}
              className={`px-6 py-3 rounded-xl font-semibold text-white shadow-md transition-all duration-200 ${
                selectedEvent.templateUrl && !ackRead
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
              }`}
            >
              Join Event
            </motion.button>
          ) : (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold shadow-md"
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
          className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100 mb-6"
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-blue-500 rounded-lg">
              <Info className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-semibold text-gray-800 text-lg">Event Preparation</h3>
          </div>
          <p className="text-gray-700 mb-4 text-sm">
            Review the event template to prepare for this session and maximize your learning experience.
          </p>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={ackRead}
                onChange={(e) => setAckRead(e.target.checked)}
                className="w-5 h-5 text-blue-500 rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-700 font-medium text-sm">
                I have read and understood the event template
              </span>
            </label>
            <motion.a
              whileHover={{ scale: 1.05 }}
              href={selectedEvent.templateUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 px-6 py-3 bg-white border border-blue-200 rounded-xl text-blue-600 hover:bg-blue-50 transition-all duration-200 font-medium shadow-sm text-sm"
            >
              <BookOpen size={16} />
              <span>View Template</span>
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
            className={`p-4 rounded-xl text-center font-medium text-sm ${
              joinMsg.toLowerCase().includes("fail") || joinMsg.toLowerCase().includes("error")
                ? "bg-red-50 text-red-700 border border-red-100"
                : "bg-green-50 text-green-700 border border-green-100"
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
  );

  const Placeholder = () => (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="max-w-lg"
      >
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.4, type: "spring" }}
          className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-xl"
        >
          <BookOpen className="w-10 h-10 text-white" />
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-2xl md:text-4xl font-bold text-gray-800 mb-4"
        >
          Explore Learning Events
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-gray-600 text-base mb-8"
        >
          Select an event from the left to dive into exciting learning opportunities.
        </motion.p>
        <StatsComponent />
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-gray-50 flex flex-col pt-16">
      <div className="flex-1 w-full mx-auto px-4 sm:px-4 md:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className={`${selectedEvent ? 'hidden' : 'block'} lg:block lg:col-span-1`}
          >
            <EventList />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className={`${selectedEvent ? 'block' : 'hidden'} lg:block lg:col-span-3`}
          >
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 md:p-8 h-[calc(100vh-4rem)] flex flex-col overflow-auto">
              {selectedEvent ? <EventDetails /> : <Placeholder />}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}