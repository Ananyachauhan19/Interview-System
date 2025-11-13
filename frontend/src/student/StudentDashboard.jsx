/* eslint-disable no-unused-vars */
import { useEffect, useState, useMemo, useCallback } from "react";
import RequirePasswordChange from "./RequirePasswordChange";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../utils/api";
import {
  CheckCircle, Clock, Calendar, Users, Info, ChevronLeft,
  BookOpen, Award, X, Search, User, UserCheck, PlusCircle, AlertCircle
} from "lucide-react";
import DateTimePicker from "../components/DateTimePicker";

export default function StudentDashboard() {
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [joinMsg, setJoinMsg] = useState("");
  const [showJoinRestriction, setShowJoinRestriction] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  // Unified selection across all 6 tabs: regular/special + all/active/upcoming, and past
  // Allowed values: 'regular-all','regular-active','regular-upcoming','special-all','special-active','special-upcoming','past'
  const [selectedKey, setSelectedKey] = useState("regular-all");
  
  // Pairing-related states
  const [pairs, setPairs] = useState([]);
  const [selectedPairRole, setSelectedPairRole] = useState(null); // 'interviewer' or 'interviewee'
  const [selectedPair, setSelectedPair] = useState(null);
  const [slots, setSlots] = useState([""]);
  const [message, setMessage] = useState("");
  const [me, setMe] = useState(null);
  const [currentProposals, setCurrentProposals] = useState({
    mine: [],
    partner: [],
    common: null,
  });
  const [selectedToAccept, setSelectedToAccept] = useState("");
  const [meetingLinkEnabled, setMeetingLinkEnabled] = useState(false);
  const [timeUntilEnable, setTimeUntilEnable] = useState(null);
  const [isLoadingPairs, setIsLoadingPairs] = useState(false);

  useEffect(() => {
    api.listEvents().then(setEvents).catch(console.error);
    api.me && api.me().then(setUser).catch(() => {});
    
    // Decode token for pairing functionality
    try {
      const t = localStorage.getItem("token");
      if (t) {
        const raw = t.split(".")?.[1];
        if (raw) {
          const payload = JSON.parse(atob(raw));
          const id = payload.sub || payload.id || payload.userId || null;
          const fallbackId = localStorage.getItem("userId") || null;
          setMe({
            id: id || fallbackId,
            role: payload.role,
            email: payload.email,
            name: payload.name,
          });
        }
      }
    } catch (e) {
      console.warn("Failed to decode token payload", e);
    }
  }, []);

  const handleEventClick = useCallback(async (event) => {
    setSelectedEvent({ ...event });
    setJoinMsg("");
    setSelectedPairRole(null); // Reset pair role selection
    setSelectedPair(null); // Reset pair selection
    setMessage(""); // Reset pairing messages
    
    // Fetch pairs for this event
    setIsLoadingPairs(true);
    try {
      const pairsData = await api.listPairs(event._id);
      const pairsWithEvent = pairsData.map((p) => ({ ...p, event }));
      setPairs(pairsWithEvent);
    } catch (err) {
      console.error("Failed to load pairs:", err);
      setPairs([]);
    } finally {
      setIsLoadingPairs(false);
    }
    
    try {
      const res = await api.getEventTemplateUrl(event._id);
      if (res?.templateUrl) {
        setSelectedEvent((prev) => (prev ? { ...prev, templateUrl: res.templateUrl } : prev));
      }
    } catch (err) {
      // Ignore template fetch errors silently
    }
  }, []);

  const handleJoinEvent = async () => {
    if (!selectedEvent) return;
    try {
      const res = await api.joinEvent(selectedEvent._id);
      setJoinMsg(res?.message || "Successfully joined the mock interview!");
      setSelectedEvent((prev) => (prev ? { ...prev, joined: true } : prev));
      setEvents((prev) => prev.map((e) => (e._id === selectedEvent._id ? { ...e, joined: true } : e)));
    } catch (err) {
      const msg = err?.message || "Failed to join the mock interview.";
      // If backend restriction triggers, show popup modal with required copy
      if (msg.includes('created before your registration')) {
        setShowJoinRestriction(true);
        setJoinMsg("");
      } else {
        setJoinMsg(msg);
      }
    }
  };

  const fmt = (d) => (d ? new Date(d).toLocaleString() : "TBD");

  // Pairing-related helper functions
  const isInterviewer = useMemo(() => {
    if (!selectedPair || !me) return false;
    const interviewer = selectedPair.interviewer;
    const interviewerId = interviewer?._id || interviewer;
    if (!interviewerId) return false;
    if (me.id && String(interviewerId) === String(me.id)) return true;
    if (me.email && interviewer?.email && interviewer.email === me.email)
      return true;
    return false;
  }, [selectedPair, me]);

  const isLocked = selectedPair?.status === "scheduled";

  const interviewerSlots = useMemo(() => {
    if (!currentProposals) return [];
    return isInterviewer
      ? currentProposals.mine || []
      : currentProposals.partner || [];
  }, [currentProposals, isInterviewer]);

  const intervieweeSlots = useMemo(() => {
    if (!currentProposals) return [];
    return isInterviewer
      ? currentProposals.partner || []
      : currentProposals.mine || [];
  }, [currentProposals, isInterviewer]);

  const getUserRoleInPair = (pair) => {
    if (!me || !pair) return null;

    const interviewerId = pair.interviewer?._id || pair.interviewer;
    const intervieweeId = pair.interviewee?._id || pair.interviewee;

    if (me.id && String(interviewerId) === String(me.id)) return "interviewer";
    if (me.id && String(intervieweeId) === String(me.id)) return "interviewee";
    if (me.email && pair.interviewer?.email === me.email) return "interviewer";
    if (me.email && pair.interviewee?.email === me.email) return "interviewee";

    return null;
  };

  // Fetch proposals when a pair is selected
  useEffect(() => {
    const fetch = async () => {
      setCurrentProposals({ mine: [], partner: [], common: null });
      setSelectedToAccept("");
      if (!selectedPair) return;
      try {
        const res = await api.proposeSlots(selectedPair._id, []);
        setCurrentProposals(res);
      } catch {
        // ignore
      }
    };
    fetch();
  }, [selectedPair]);

  // Meeting link timer
  useEffect(() => {
    let timer;
    if (!selectedPair?.scheduledAt) {
      setMeetingLinkEnabled(false);
      setTimeUntilEnable(null);
      return;
    }
    const scheduled = new Date(selectedPair.scheduledAt).getTime();
    const enableAt = scheduled - 30 * 60 * 1000;

    function tick() {
      const now = Date.now();
      if (now >= enableAt) {
        setMeetingLinkEnabled(true);
        setTimeUntilEnable(0);
      } else {
        setMeetingLinkEnabled(false);
        setTimeUntilEnable(enableAt - now);
      }
    }

    tick();
    timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [selectedPair?.scheduledAt]);

  useEffect(() => {
    setSelectedToAccept("");
  }, [currentProposals.mine, currentProposals.partner]);

  // Pairing action handlers
  const handlePropose = async () => {
    setMessage("");
    
    if (isLoadingPairs) return;
    setIsLoadingPairs(true);
    
    function parseLocalDateTime(value) {
      if (!value) return NaN;
      const [datePart, timePart] = String(value).split("T");
      if (!datePart || !timePart) return NaN;
      const [y, m, d] = datePart.split("-").map(Number);
      const [hh, mm] = timePart.split(":").map(Number);
      if ([y, m, d, hh, mm].some((v) => Number.isNaN(v))) return NaN;
      return new Date(y, m - 1, d, hh, mm).getTime();
    }

    const isoSlots = slots.filter(Boolean).map((s) => {
      if (String(s).endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(String(s))) {
        const d = new Date(s);
        if (!isNaN(d.getTime())) return d.toISOString();
      }
      const t = parseLocalDateTime(s);
      if (!isNaN(t)) return new Date(t).toISOString();
      return s;
    });
    if (!selectedPair || isoSlots.length === 0) {
      setMessage("Please select a pair and add at least one slot.");
      setIsLoadingPairs(false);
      return;
    }
    
    try {
      const ev = selectedPair.event || {};
      const startBoundary = ev.startDate
        ? new Date(ev.startDate).getTime()
        : null;
      const endBoundary = ev.endDate ? new Date(ev.endDate).getTime() : null;
      const parsed = isoSlots.map((s) => new Date(s));
      if (parsed.some((d) => isNaN(d.getTime()))) {
        setMessage("One or more slots are invalid");
        setIsLoadingPairs(false);
        return;
      }
      if (startBoundary && parsed.some((d) => d.getTime() < startBoundary)) {
        setMessage("One or more slots are before the event start");
        setIsLoadingPairs(false);
        return;
      }
      if (endBoundary && parsed.some((d) => d.getTime() > endBoundary)) {
        setMessage("One or more slots are after the event end");
        setIsLoadingPairs(false);
        return;
      }
    } catch (e) {
      // ignore parsing errors handled above
    }
    if (!isInterviewer && isoSlots.length > 3) {
      setMessage("You may propose up to 3 alternative slots");
      setIsLoadingPairs(false);
      return;
    }
    try {
      const res = await api.proposeSlots(selectedPair._id, isoSlots);
      if (res.common)
        setMessage(
          `Common slot found: ${new Date(res.common).toLocaleString()}`
        );
      else setMessage("Slots proposed. Waiting for partner.");
      const ro = await api.proposeSlots(selectedPair._id, []);
      setCurrentProposals(ro);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setIsLoadingPairs(false);
    }
  };

  const addSlot = () => {
    if (!isInterviewer && slots.filter(Boolean).length >= 3) {
      setMessage("You may propose up to 3 alternative slots");
      return;
    }
    setSlots((s) => [...s, ""]);
  };

  const removeSlot = (idx) => {
    setSlots((s) => s.filter((_, i) => i !== idx));
  };

  const handleConfirm = async (dt, link) => {
    if (!selectedPair || !selectedEvent) return;
    try {
      const iso = dt && dt.includes("T") ? new Date(dt).toISOString() : dt;
      await api.confirmSlot(selectedPair._id, iso, link);
      setMessage("Scheduled successfully!");
      
      const pairsData = await api.listPairs(selectedEvent._id);
      const pairsWithEvent = pairsData.map((p) => ({ ...p, event: selectedEvent }));
      setPairs(pairsWithEvent);
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleReject = async () => {
    if (!selectedPair || !selectedEvent) return;
    try {
      await api.rejectSlots(selectedPair._id);
      setMessage("Rejected slots. Waiting for new proposal from interviewer.");
      
      const pairsData = await api.listPairs(selectedEvent._id);
      const pairsWithEvent = pairsData.map((p) => ({ ...p, event: selectedEvent }));
      setPairs(pairsWithEvent);
      setCurrentProposals({ mine: [], partner: [], common: null });
    } catch (err) {
      setMessage(err.message);
    }
  };

  const now = new Date();
  // Derive current event type and status from unified key
  const currentType = selectedKey === "past" ? "past" : (selectedKey.startsWith("special") ? "special" : "regular");
  const currentStatus = selectedKey === "past" ? "all" : (selectedKey.endsWith("-active") ? "active" : selectedKey.endsWith("-upcoming") ? "upcoming" : "all");

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.description.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    
    // Calculate event status
    const isPast = event.endDate && new Date(event.endDate) < now;
    const isUpcoming = event.startDate && new Date(event.startDate) > now;
    const isActive = !isPast && !isUpcoming;
    
    // Filter by event type (regular/special/past)
    if (currentType === "past") {
      return isPast;
    } else if (currentType === "special") {
      if (!event.isSpecial || isPast) return false;
    } else if (currentType === "regular") {
      if (event.isSpecial || isPast) return false;
    }
    
    // Filter by status (all/active/upcoming) - only for non-past events
    if (currentType !== "past" && currentStatus !== "all") {
      if (currentStatus === "active") {
        return isActive;
      }
      if (currentStatus === "upcoming") {
        return isUpcoming;
      }
    }
    
    return true;
  });

  const stats = {
    totalEvents: events.length,
    joinedEvents: events.filter(e => e.joined).length,
    completedEvents: events.filter(e => e.endDate && new Date(e.endDate) < new Date()).length,
    specialEvents: events.filter(e => e.isSpecial).length
  };

  const StatsComponent = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-3 gap-3 mb-4"
    >
      {[
        { label: "Total", value: stats.totalEvents, icon: BookOpen, color: "sky" },
        { label: "Joined", value: stats.joinedEvents, icon: CheckCircle, color: "emerald" },
        { label: "Special", value: stats.specialEvents, icon: Award, color: "purple" }
      ].map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.1 }}
          className={`bg-white rounded-lg border border-slate-200 p-3`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold text-slate-800">{stat.value}</div>
              <div className="text-xs text-slate-600">{stat.label}</div>
            </div>
            <div className={`p-1.5 bg-${stat.color}-50 rounded`}>
              <stat.icon className={`w-3 h-3 text-${stat.color}-600`} />
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );

  const EventList = () => (
    <div className="bg-white rounded-lg border border-slate-200 p-4 h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
      <div className="lg:hidden mb-4">
        <StatsComponent />
      </div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-800">Mock Interviews</h2>
        <span className="px-2 py-0.5 bg-sky-500 text-white rounded text-xs font-medium">
          {filteredEvents.length}
        </span>
      </div>
      
      {/* Helper copy for tabs */}
      <div className="mb-2 text-xs text-slate-600">
        Select type (Regular/Special) and filter by status (All/Active/Upcoming)
      </div>
      
      {/* Event Type Tabs (top row) - highlight only when on "All" for that type to avoid double selection */}
      <div className="flex space-x-1 mb-3 p-1 bg-slate-100 rounded">
        {[
          { id: "regular", label: "Regular" },
          { id: "special", label: "Special" },
          { id: "past", label: "Past" }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              if (tab.id === "past") {
                setSelectedKey("past");
              } else {
                // Switch type and default to its "all" view
                setSelectedKey(`${tab.id}-all`);
              }
            }}
            className={`flex-1 py-1.5 px-2 rounded text-xs font-medium transition-colors ${
              // Highlight the type tab whenever any status of that type is selected; past highlights only when selected
              (tab.id === "past" && selectedKey === "past") ||
              (tab.id !== "past" && selectedKey.startsWith(tab.id))
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-600 hover:text-slate-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      {/* Status Filters (bottom row) - only show for regular and special events */}
      {currentType !== "past" && (
        <div className="flex space-x-1 mb-3 p-1 bg-slate-100 rounded">
          {["all", "active", "upcoming"].map((filter) => (
            <button
              key={filter}
              onClick={() => {
                const type = selectedKey.startsWith("special") ? "special" : "regular";
                setSelectedKey(`${type}-${filter}`);
              }}
              className={`flex-1 py-1 px-2 rounded text-xs font-medium transition-colors ${
                currentStatus === filter
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-slate-500" />
        <input
          type="text"
          placeholder="Search mock interviews..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-7 pr-3 py-1.5 bg-slate-50 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500 text-sm"
        />
      </div>

      {/* Event List */}
      <div className="space-y-2 flex-1 overflow-y-auto pr-1">
        {filteredEvents.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-slate-500 py-6"
          >
            <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm">No mock interviews found</p>
          </motion.div>
        ) : (
          filteredEvents.map((event, index) => {
            const active = selectedEvent && selectedEvent._id === event._id;
            const isUpcoming = new Date(event.startDate) > now;
            const isActive = !isUpcoming && (!event.endDate || new Date(event.endDate) > now);
            const isPast = event.endDate && new Date(event.endDate) < now;
            const isSpecial = event.isSpecial;
            
            // Get pairing info for this event
            const eventPairs = pairs.filter(p => p.event._id === event._id);
            const interviewerPair = eventPairs.find(p => getUserRoleInPair(p) === "interviewer");
            const intervieweePair = eventPairs.find(p => getUserRoleInPair(p) === "interviewee");
            
            return (
              <div key={event._id} className="space-y-1">
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleEventClick(event)}
                  className={`w-full text-left p-3 rounded-lg transition-colors border ${
                    active
                      ? isSpecial
                        ? "border-purple-300 bg-purple-50"
                        : "border-sky-300 bg-sky-50"
                      : "border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300"
                  } ${event.joined 
                      ? isSpecial 
                        ? "ring-1 ring-purple-200" 
                        : "ring-1 ring-emerald-200" 
                      : ""
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className={`p-1.5 rounded ${
                      event.joined
                        ? isSpecial
                          ? "bg-purple-100 text-purple-600"
                          : isActive 
                          ? "bg-emerald-100 text-emerald-600"
                          : isPast
                          ? "bg-slate-100 text-slate-600"
                          : "bg-amber-100 text-amber-600"
                        : "bg-sky-100 text-sky-600"
                    }`}>
                      {event.joined ? <CheckCircle size={14} /> : <Calendar size={14} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-medium text-slate-800 truncate text-sm">{event.name}</h3>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {event.joined && (
                            <CheckCircle size={12} className={`${
                              isSpecial 
                                ? "text-purple-500" 
                                : isActive 
                                ? "text-emerald-500" 
                                : isPast
                                ? "text-slate-500"
                                : "text-amber-500"
                            }`} />
                          )}
                          {isSpecial && (
                            <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded font-medium">
                              Special
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{event.description}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {fmt(event.startDate)}
                        </span>
                        {event.joined && (
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            isSpecial
                              ? isActive
                                ? "bg-purple-100 text-purple-700"
                                : "bg-purple-50 text-purple-600"
                              : isActive 
                              ? "bg-emerald-100 text-emerald-700" 
                              : isPast
                              ? "bg-slate-100 text-slate-600"
                              : "bg-amber-100 text-amber-700"
                          }`}>
                            {isActive ? "Active" : isPast ? "Past" : "Upcoming"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.button>
                
                {/* Pairing Tabs - Show when event is selected and joined */}
                {active && event.joined && (interviewerPair || intervieweePair) && (
                  <div className="ml-6 space-y-1">
                    {interviewerPair && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (selectedPairRole !== "interviewer" || selectedPair?._id !== interviewerPair._id) {
                            setSelectedPairRole("interviewer");
                            setSelectedPair(interviewerPair);
                          }
                        }}
                        className={`w-full text-left px-3 py-2 rounded text-xs transition-colors border ${
                          selectedPairRole === "interviewer" && selectedPair?._id === interviewerPair._id
                            ? "bg-sky-100 border-sky-300 text-sky-900"
                            : "bg-white border-slate-200 hover:border-sky-200 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <User className="w-3 h-3" />
                          <div className="flex-1">
                            <div className="font-medium">Interviewer</div>
                            <div className="text-xs text-slate-600 mt-0.5">
                              {event.name}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                isActive ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                              }`}>
                                {isActive ? "Active" : "Pending"}
                              </span>
                              <span className="text-xs text-slate-500 truncate">
                                {interviewerPair.interviewer?.name} ➜ {interviewerPair.interviewee?.name}
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    )}
                    {intervieweePair && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (selectedPairRole !== "interviewee" || selectedPair?._id !== intervieweePair._id) {
                            setSelectedPairRole("interviewee");
                            setSelectedPair(intervieweePair);
                          }
                        }}
                        className={`w-full text-left px-3 py-2 rounded text-xs transition-colors border ${
                          selectedPairRole === "interviewee" && selectedPair?._id === intervieweePair._id
                            ? "bg-emerald-100 border-emerald-300 text-emerald-900"
                            : "bg-white border-slate-200 hover:border-emerald-200 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <UserCheck className="w-3 h-3" />
                          <div className="flex-1">
                            <div className="font-medium">Interviewee</div>
                            <div className="text-xs text-slate-600 mt-0.5">
                              {event.name}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                isActive ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                              }`}>
                                {isActive ? "Active" : "Pending"}
                              </span>
                              <span className="text-xs text-slate-500 truncate">
                                {intervieweePair.interviewer?.name} ➜ {intervieweePair.interviewee?.name}
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  const PairingDetails = () => (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            {selectedPair.interviewer?.name ||
              selectedPair.interviewer?.email}{" "}
            ➜{" "}
            {selectedPair.interviewee?.name ||
              selectedPair.interviewee?.email}
          </h2>

          <div className="flex flex-wrap gap-2 mb-3">
            <span
              className={`text-xs px-2 py-1 rounded font-medium ${
                isInterviewer
                  ? "bg-sky-100 text-sky-800"
                  : "bg-emerald-100 text-emerald-800"
              }`}
            >
              You are the{" "}
              {isInterviewer ? "Interviewer" : "Interviewee"}
            </span>

            <span
              className={`text-xs px-2 py-1 rounded font-medium ${
                selectedPair.status === "scheduled"
                  ? "bg-emerald-100 text-emerald-800"
                  : selectedPair.status === "rejected"
                  ? "bg-red-100 text-red-700"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {selectedPair.status || "Pending"}
            </span>
          </div>
        </div>

        <button
          onClick={() => {
            setSelectedPairRole(null);
            setSelectedPair(null);
          }}
          className="p-1.5 rounded bg-slate-100 hover:bg-slate-200 lg:hidden"
        >
          <X className="w-4 h-4 text-slate-600" />
        </button>
      </div>

      {isLocked && (
        <div className="p-4 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200 text-sm flex items-start">
          <CheckCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
          <div>
            <div className="font-medium">
              Interview scheduled and confirmed
            </div>
            {selectedPair?.scheduledAt && (
              <div className="text-emerald-800 mt-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {new Date(
                  selectedPair.scheduledAt
                ).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Date Input Section */}
        <div className="max-w-md space-y-3">
          <h3 className="font-medium text-slate-900 text-sm">
            Proposed Time Slots
          </h3>
          {slots.map((s, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <DateTimePicker
                value={s}
                onChange={(isoDateTime) => {
                  const v = isoDateTime;
                  const ev = selectedPair?.event || {};
                  const toLocal = (val) => {
                    if (!val) return "";
                    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(val))
                      return val;
                    const d = new Date(val);
                    if (isNaN(d.getTime())) return "";
                    const pad = (n) => String(n).padStart(2, "0");
                    return `${d.getFullYear()}-${pad(
                      d.getMonth() + 1
                    )}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
                      d.getMinutes()
                    )}`;
                  };
                  const startLocal = ev.startDate
                    ? toLocal(ev.startDate)
                    : null;
                  const endLocal = ev.endDate
                    ? toLocal(ev.endDate)
                    : null;
                  if (startLocal && v < startLocal) {
                    setMessage(
                      "Selected time is before event start - adjusted to event start time"
                    );
                    setSlots((prev) =>
                      prev.map((val, i) =>
                        i === idx ? startLocal : val
                      )
                    );
                    return;
                  }
                  if (endLocal && v > endLocal) {
                    setMessage(
                      "Selected time is after event end - adjusted to event end time"
                    );
                    setSlots((prev) =>
                      prev.map((val, i) =>
                        i === idx ? endLocal : val
                      )
                    );
                    return;
                  }
                  setSlots((prev) =>
                    prev.map((v2, i) => (i === idx ? v : v2))
                  );
                }}
                min={selectedPair?.event?.startDate}
                max={selectedPair?.event?.endDate}
                placeholder="Select interview time"
                className="flex-1 text-sm"
                disabled={isLocked}
              />
              {!isLocked && slots.length > 1 && (
                <button
                  onClick={() => removeSlot(idx)}
                  className="p-2 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        {!isLocked && (
          <div className="flex items-center gap-3">
            <button
              onClick={addSlot}
              disabled={
                !isInterviewer && slots.filter(Boolean).length >= 3
              }
              className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 text-sm font-medium transition-colors disabled:opacity-50"
            >
              <PlusCircle className="w-4 h-4" />
              Add Time Slot
            </button>
            <div className="text-xs text-slate-600">
              {isInterviewer 
                ? "Add multiple available time slots" 
                : "You may propose up to 3 alternative time slots"
              }
            </div>
          </div>
        )}

        {/* Proposed Slots Grid */}
        {!isLocked && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-slate-50 rounded-lg p-4">
              <h4 className="font-semibold text-slate-900 mb-3 text-sm">
                Interviewer Proposed Times
              </h4>
              <div className="text-xs text-slate-600 mb-3">
                Time slots suggested by interviewer for the interview
              </div>
              <ul className="space-y-2">
                {interviewerSlots.length > 0 ? (
                  interviewerSlots.map((s, i) => (
                    <li
                      key={i}
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                        selectedToAccept === s
                          ? "bg-indigo-50 border-indigo-200"
                          : "bg-white border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {!isInterviewer && (
                        <input
                          type="radio"
                          name="acceptSlot"
                          value={s}
                          checked={selectedToAccept === s}
                          onChange={() => setSelectedToAccept(s)}
                          className="mt-1 text-indigo-600 focus:ring-indigo-500"
                        />
                      )}
                      <div className="flex-1">
                        <div className="text-sm font-medium text-slate-900">
                          {new Date(s).toLocaleString()}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          Proposed by:{" "}
                          {selectedPair?.interviewer?.name ||
                            selectedPair?.interviewer?.email}
                        </div>
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="text-slate-500 text-sm text-center py-4">
                    No time slots proposed yet
                  </li>
                )}
              </ul>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <h4 className="font-semibold text-slate-900 mb-3 text-sm">
                Interviewee Proposed Times
              </h4>
              <div className="text-xs text-slate-600 mb-3">
                Alternative time slots suggested by interviewee
              </div>
              <ul className="space-y-2">
                {intervieweeSlots.length > 0 ? (
                  intervieweeSlots.map((s, i) => (
                    <li
                      key={i}
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                        selectedToAccept === s
                          ? "bg-indigo-50 border-indigo-200"
                          : "bg-white border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {isInterviewer && (
                        <input
                          type="radio"
                          name="acceptSlot"
                          value={s}
                          checked={selectedToAccept === s}
                          onChange={() => setSelectedToAccept(s)}
                          className="mt-1 text-indigo-600 focus:ring-indigo-500"
                        />
                      )}
                      <div className="flex-1">
                        <div className="text-sm font-medium text-slate-900">
                          {new Date(s).toLocaleString()}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          Proposed by:{" "}
                          {selectedPair?.interviewee?.name ||
                            selectedPair?.interviewee?.email}
                        </div>
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="text-slate-500 text-sm text-center py-4">
                    No alternative slots proposed
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}
      </div>

      {currentProposals.common && (
        <div className="p-4 bg-blue-50 text-blue-800 rounded-lg border border-blue-200 text-sm flex items-center">
          <Clock className="w-4 h-4 mr-2 flex-shrink-0" />
          <div>
            <span className="font-medium">Common slot identified: </span>
            {new Date(currentProposals.common).toLocaleString()}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <button
          disabled={isLocked}
          onClick={handlePropose}
          className="px-5 py-2.5 bg-sky-600 text-white rounded-lg font-medium text-sm hover:bg-sky-700 transition-colors disabled:opacity-50"
        >
          {isInterviewer ? "Propose Time Slots" : "Suggest Alternatives"}
        </button>

        <div className="flex gap-2">
          <button
            disabled={!selectedToAccept || isLocked}
            onClick={() => handleConfirm(selectedToAccept, "")}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            Accept Selected Time
          </button>

          <button
            disabled={isLocked}
            onClick={handleReject}
            className="px-5 py-2.5 bg-red-600 text-white rounded-lg font-medium text-sm hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            Reject All
          </button>
        </div>
      </div>

      {isLocked && selectedPair.meetingLink && (
        <div className="mt-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-indigo-900 text-sm">
              Meeting Details
            </span>
            <span className="text-xs text-slate-600 bg-white px-2 py-1 rounded border">
              Jitsi Meet
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              readOnly
              value={
                meetingLinkEnabled
                  ? selectedPair.meetingLink
                  : `Meeting link will be available ${new Date(
                      new Date(selectedPair.scheduledAt).getTime() -
                        30 * 60 * 1000
                    ).toLocaleString()}`
              }
              className={`flex-1 border rounded-lg px-3 py-2 text-sm font-medium ${
                meetingLinkEnabled
                  ? "bg-white border-indigo-300 text-slate-900"
                  : "bg-slate-100 border-slate-300 text-slate-500"
              }`}
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (!meetingLinkEnabled) return;
                  window.open(selectedPair.meetingLink, "_blank");
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  meetingLinkEnabled
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                    : "bg-slate-300 text-slate-500 cursor-not-allowed"
                }`}
                disabled={!meetingLinkEnabled}
              >
                Join Meeting
              </button>
              <button
                onClick={() => {
                  if (!meetingLinkEnabled) return;
                  navigator.clipboard.writeText(
                    selectedPair.meetingLink
                  );
                  setMessage("Meeting link copied to clipboard");
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  meetingLinkEnabled
                    ? "bg-white border border-indigo-300 hover:bg-indigo-50 text-indigo-700"
                    : "bg-slate-100 border border-slate-300 text-slate-400 cursor-not-allowed"
                }`}
                disabled={!meetingLinkEnabled}
              >
                Copy Link
              </button>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className={`flex items-center text-sm p-3 rounded-lg ${
              message.toLowerCase().includes("success") || 
              message.toLowerCase().includes("copied")
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {message.toLowerCase().includes("success") || 
             message.toLowerCase().includes("copied") ? (
              <CheckCircle className="w-4 h-4 mr-2 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
            )}
            {message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Disclaimer */}
      <div className="mt-4 pt-4 border-t border-slate-200">
        <p className="text-xs text-slate-500 text-center italic">
          <Info className="w-3 h-3 inline mr-1" />
          Interviewer proposes available time slots. Interviewee can accept a proposed slot or suggest up to 3 alternative time slots for consideration.
        </p>
      </div>
    </div>
  );

  const EventDetails = () => (
    <div className="flex-1 flex flex-col">
      {/* If a pair is selected, show pairing details instead of event details */}
      {selectedPairRole && selectedPair ? (
        <PairingDetails />
      ) : (
        <>
          {/* Mobile Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:hidden flex items-center gap-2 mb-4 p-3 bg-white border-b border-slate-200 sticky top-0"
          >
            <button
              onClick={() => setSelectedEvent(null)}
              className="p-1.5 rounded bg-slate-100 hover:bg-slate-200"
            >
              <ChevronLeft size={16} className="text-slate-700" />
            </button>
            <h2 className="text-lg font-semibold text-slate-800 truncate">{selectedEvent.name}</h2>
          </motion.div>

      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-4">
        <div className="flex-1">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 mb-3 flex-wrap"
          >
            {selectedEvent.isSpecial && (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                <Award size={12} />
                <span>Special Interview</span>
              </div>
            )}
            {selectedEvent.joined && (
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                selectedEvent.isSpecial
                  ? "bg-purple-100 text-purple-700"
                  : new Date(selectedEvent.startDate) > new Date()
                  ? "bg-amber-100 text-amber-700"
                  : "bg-emerald-100 text-emerald-700"
              }`}>
                <CheckCircle size={12} />
                <span>Joined</span>
              </div>
            )}
            {!selectedEvent.isSpecial && (
              <span className="px-2 py-0.5 bg-sky-100 text-sky-700 rounded text-xs font-medium">
                {new Date(selectedEvent.startDate) > new Date() ? 'Upcoming' : 
                 new Date(selectedEvent.endDate) < new Date() ? 'Past' : 'Active'}
              </span>
            )}
          </motion.div>
          
          <h2 className="hidden lg:block text-xl font-semibold text-slate-800 mb-3">
            {selectedEvent.name}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
            <div className="flex items-center gap-2 p-2 bg-slate-50 rounded">
              <Clock className="w-4 h-4 text-sky-500" />
              <div>
                <div className="text-xs text-slate-500">Start Time</div>
                <div className="font-medium text-slate-800 text-sm">{fmt(selectedEvent.startDate)}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-slate-50 rounded">
              <Clock className="w-4 h-4 text-indigo-500" />
              <div>
                <div className="text-xs text-slate-500">End Time</div>
                <div className="font-medium text-slate-800 text-sm">{fmt(selectedEvent.endDate)}</div>
              </div>
            </div>
          </div>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-slate-700 text-sm bg-slate-50 p-3 rounded"
          >
            {selectedEvent.description}
          </motion.p>
        </div>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-end gap-2"
        >
          {!selectedEvent.joined ? (
            (() => {
              const now = new Date();
              const joinDisabled = selectedEvent.joinDisabled || (selectedEvent.joinDisableTime && now > new Date(selectedEvent.joinDisableTime));
              return (
                <button
                  onClick={handleJoinEvent}
                  disabled={joinDisabled}
                  className={`px-4 py-2 rounded-lg font-medium text-white text-sm transition-colors ${
                    joinDisabled ? "bg-slate-400 cursor-not-allowed" : "bg-sky-500 hover:bg-sky-600"
                  }`}
                >
                  {joinDisabled ? "Participation Closed" : "Join Interview"}
                </button>
              );
            })()
          ) : (
            <div className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-white font-medium text-sm ${
              selectedEvent.isSpecial
                ? "bg-purple-500"
                : new Date(selectedEvent.startDate) > new Date()
                ? "bg-amber-500"
                : "bg-emerald-500"
            }`}>
              <CheckCircle size={16} />
              <span>Successfully Joined</span>
            </div>
          )}
        </motion.div>
      </div>

      {/* Template Section */}
      {selectedEvent && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-sky-50 rounded-lg p-3 border border-sky-200 mb-3"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-sky-500 rounded">
              <Info className="w-3 h-3 text-white" />
            </div>
            <h3 className="font-medium text-slate-800 text-sm">Interview Preparation</h3>
          </div>
          <p className="text-slate-700 text-xs mb-2">
            Review the template to prepare for this session.
          </p>
          <div className="flex justify-end">
            <button
              onClick={(e) => { if (selectedEvent.templateUrl) window.open(selectedEvent.templateUrl, '_blank'); }}
              disabled={!selectedEvent.templateUrl}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                !selectedEvent.templateUrl 
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                  : 'bg-white border border-sky-300 text-sky-600 hover:bg-sky-50'
              }`}
            >
              <BookOpen size={12} />
              <span>View Template</span>
            </button>
          </div>
        </motion.div>
      )}

      {/* Join Message */}
      <AnimatePresence>
        {joinMsg && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className={`p-2 rounded text-xs text-center font-medium ${
              joinMsg.toLowerCase().includes("fail") || joinMsg.toLowerCase().includes("error")
                ? "bg-red-50 text-red-700 border border-red-200"
                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
            }`}
          >
            <div className="flex items-center justify-center gap-1">
              {joinMsg.toLowerCase().includes("fail") || joinMsg.toLowerCase().includes("error") ? (
                <X className="w-3 h-3" />
              ) : (
                <CheckCircle className="w-3 h-3" />
              )}
              <span>{joinMsg}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Join restriction modal */}
      <AnimatePresence>
        {showJoinRestriction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-[90%] max-w-sm rounded-xl shadow-xl border border-slate-200 p-4"
            >
              <div className="flex items-start gap-2">
                <div className="p-2 rounded bg-amber-100 text-amber-700">
                  <Info className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-slate-800 mb-1">Action not allowed</h3>
                  <p className="text-sm text-slate-600">
                    You cannot join this mock interview because it was created before your registration.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setShowJoinRestriction(false)}
                  className="px-3 py-1.5 text-sm rounded-lg bg-slate-800 text-white hover:bg-slate-700"
                >
                  OK
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
        </>
      )}
    </div>
  );

  const Placeholder = () => (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-16 h-16 mx-auto mb-4 bg-indigo-800 rounded-lg flex items-center justify-center"
        >
          <BookOpen className="w-6 h-6 text-white" />
        </motion.div>
        <h1 className="text-xl font-semibold text-slate-800 mb-2">
          Mock Interview Sessions
        </h1>
        <p className="text-slate-600 text-sm mb-4">
          Select a mock interview to view details and join.
        </p>
        <StatsComponent />
      </motion.div>
    </div>
  );

  return (
    <RequirePasswordChange user={user}>
      <div className="min-h-screen w-full bg-slate-50 flex flex-col pt-16">
        <div className="flex-1 w-full mx-auto px-4 py-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`${selectedEvent ? 'hidden' : 'block'} lg:block lg:col-span-1`}
            >
              <EventList />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`${selectedEvent ? 'block' : 'hidden'} lg:block lg:col-span-3`}
            >
              <div className="bg-white rounded-lg border border-slate-200 p-4 h-[calc(100vh-4rem)] flex flex-col overflow-auto">
                {selectedEvent ? <EventDetails /> : <Placeholder />}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </RequirePasswordChange>
  );
}