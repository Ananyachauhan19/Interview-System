/* eslint-disable no-unused-vars */
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import RequirePasswordChange from "./RequirePasswordChange";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../utils/api";
import {
  CheckCircle, Clock, Calendar, Users, Info, ChevronLeft,
  BookOpen, Award, X, Search, User, UserCheck, PlusCircle, AlertCircle
} from "lucide-react";
import DateTimePicker from "../components/DateTimePicker";

export default function StudentDashboard() {
  const navigate = useNavigate();
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
  const [showPastDropdown, setShowPastDropdown] = useState(false);
  const pastDropdownRef = useRef(null);
  const [showProposeForm, setShowProposeForm] = useState(false);

  const startFeedbackCountdown = useCallback((pair) => {
    if (!pair) {
      console.log('[Feedback] No pair provided');
      return;
    }
    const myId = (typeof window !== 'undefined') ? localStorage.getItem('userId') : null;
    const interviewerId = pair?.interviewer?._id || pair?.interviewer;
    const isInterviewer = myId && String(interviewerId) === String(myId);
    
    console.log('[Feedback] User check:', { myId, interviewerId, isInterviewer });
    
    if (!isInterviewer) {
      console.log('[Feedback] User is not interviewer, skipping countdown');
      return;
    }
    
    const key = `feedbackTimer:${pair._id}`;
    const now = Date.now();
    // Changed from 2 minutes to 10 seconds for testing
    const dueAt = now + 10 * 1000; // 10 seconds
    const payload = { pairId: pair._id, startAt: now, dueAt };
    
    try {
      localStorage.setItem(key, JSON.stringify(payload));
      console.log('[Feedback] Timer started:', { pairId: pair._id, delay: '10 seconds' });
    } catch (e) {
      console.error('[Feedback] Failed to save timer:', e);
    }
    
    const delay = Math.max(0, dueAt - Date.now());
    console.log('[Feedback] Will navigate in', delay, 'ms');
    
    setTimeout(() => {
      console.log('[Feedback] Navigating to feedback form:', `/student/feedback/${pair._id}`);
      navigate(`/student/feedback/${pair._id}`);
    }, delay);
  }, [navigate]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const eventsData = await api.listEvents();
        setEvents(eventsData);
        
        // Fetch pairs for all joined events
        const joinedEvents = eventsData.filter(e => e.joined);
        if (joinedEvents.length > 0) {
          const allPairs = [];
          for (const event of joinedEvents) {
            try {
              const pairsData = await api.listPairs(event._id);
              const pairsWithEvent = pairsData.map((p) => ({ ...p, event }));
              allPairs.push(...pairsWithEvent);
            } catch (err) {
              console.error(`Failed to load pairs for event ${event._id}:`, err);
            }
          }
          setPairs(allPairs);
        }
      } catch (err) {
        console.error("Failed to load events:", err);
      }
    };
    
    // Check if feedback was just submitted
    const feedbackFlag = localStorage.getItem('feedbackJustSubmitted');
    if (feedbackFlag === 'true') {
      console.log('[Dashboard] Feedback just submitted, forcing immediate refresh...');
      localStorage.removeItem('feedbackJustSubmitted');
    }
    
    loadData();
    
    // Fetch user profile from backend
    api.me().then((userData) => {
      console.log('[Dashboard] User data fetched:', userData);
      setUser(userData);
    }).catch((err) => {
      console.error('[Dashboard] Failed to fetch user data:', err);
    });
    
    // Decode token for pairing functionality
    try {
      const t = localStorage.getItem("token");
      if (t) {
        const raw = t.split(".")?.[1];
        if (raw) {
          const payload = JSON.parse(atob(raw));
          const id = payload.sub || payload.id || payload.userId || null;
          const fallbackId = localStorage.getItem("userId") || null;
          const meData = {
            id: id || fallbackId,
            role: payload.role,
            email: payload.email,
            name: payload.name,
          };
          setMe(meData);
          console.log('[Dashboard] User identity set for pairing:', meData);
        }
      }
    } catch (e) {
      console.warn("Failed to decode token payload", e);
    }
    
    // Add event listener to refresh data when window regains focus
    // This ensures both interviewer and interviewee see updated status
    const handleFocus = () => {
      console.log('[Dashboard] Window focused, refreshing data...');
      loadData();
    };
    
    window.addEventListener('focus', handleFocus);
    
    // Cleanup listener on unmount
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const handleEventClick = useCallback(async (event) => {
    setSelectedEvent({ ...event });
    setJoinMsg("");
    setSelectedPairRole(null); // Reset pair role selection
    setSelectedPair(null); // Reset pair selection
    setMessage(""); // Reset pairing messages
    setSearchTerm(""); // Clear search when event is selected
    
    // Refresh pairs for this event if it's joined
    if (event.joined) {
      setIsLoadingPairs(true);
      try {
        const pairsData = await api.listPairs(event._id);
        const pairsWithEvent = pairsData.map((p) => ({ ...p, event }));
        
        // Update pairs state by removing old pairs for this event and adding new ones
        setPairs(prevPairs => {
          const filteredPairs = prevPairs.filter(p => p.event._id !== event._id);
          return [...filteredPairs, ...pairsWithEvent];
        });
      } catch (err) {
        console.error("Failed to load pairs:", err);
      } finally {
        setIsLoadingPairs(false);
      }
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

  const handleCloseEvent = useCallback(() => {
    setSelectedEvent(null);
    setSelectedPairRole(null);
    setSelectedPair(null);
    setMessage("");
  }, []);

  const handleJoinEvent = async () => {
    if (!selectedEvent) return;
    try {
      const res = await api.joinEvent(selectedEvent._id);
      setJoinMsg(res?.message || "Successfully joined the interview!");
      setSelectedEvent((prev) => (prev ? { ...prev, joined: true } : prev));
      setEvents((prev) => prev.map((e) => (e._id === selectedEvent._id ? { ...e, joined: true } : e)));
      
      // Fetch pairs for the newly joined event
      try {
        const pairsData = await api.listPairs(selectedEvent._id);
        const pairsWithEvent = pairsData.map((p) => ({ ...p, event: selectedEvent }));
        setPairs(prevPairs => {
          const filteredPairs = prevPairs.filter(p => p.event._id !== selectedEvent._id);
          return [...filteredPairs, ...pairsWithEvent];
        });
      } catch (pairErr) {
        console.error("Failed to load pairs after joining:", pairErr);
      }
    } catch (err) {
      const msg = err?.message || "Failed to join the interview.";
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
  const isCompleted = selectedPair?.status === "completed";

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

  // Track proposal counts
  const myProposalCount = isInterviewer 
    ? selectedPair?.interviewerProposalCount || 0
    : selectedPair?.intervieweeProposalCount || 0;
  const partnerProposalCount = isInterviewer
    ? selectedPair?.intervieweeProposalCount || 0
    : selectedPair?.interviewerProposalCount || 0;
  const myRemainingProposals = Math.max(0, 3 - myProposalCount);
  const partnerRemainingProposals = Math.max(0, 3 - partnerProposalCount);
  const bothReachedLimit = myProposalCount >= 3 && partnerProposalCount >= 3;

  const getUserRoleInPair = (pair) => {
    if (!me || !pair) {
      console.log('[Dashboard] getUserRoleInPair: Missing me or pair', { me, pair: !!pair });
      return null;
    }

    const interviewerId = pair.interviewer?._id || pair.interviewer;
    const intervieweeId = pair.interviewee?._id || pair.interviewee;

    if (me.id && String(interviewerId) === String(me.id)) {
      console.log('[Dashboard] User is interviewer in pair', { userId: me.id, interviewerId });
      return "interviewer";
    }
    if (me.id && String(intervieweeId) === String(me.id)) {
      console.log('[Dashboard] User is interviewee in pair', { userId: me.id, intervieweeId });
      return "interviewee";
    }
    if (me.email && pair.interviewer?.email === me.email) {
      console.log('[Dashboard] User is interviewer by email', { email: me.email });
      return "interviewer";
    }
    if (me.email && pair.interviewee?.email === me.email) {
      console.log('[Dashboard] User is interviewee by email', { email: me.email });
      return "interviewee";
    }

    console.log('[Dashboard] User not found in pair', { 
      userId: me.id, 
      userEmail: me.email, 
      interviewerId, 
      intervieweeId,
      interviewerEmail: pair.interviewer?.email,
      intervieweeEmail: pair.interviewee?.email
    });
    return null;
  };

  // Helper function to get message styling based on content
  const getMessageStyle = (msg) => {
    const lowerMsg = msg.toLowerCase();
    
    // Success messages
    if (lowerMsg.includes("success") || 
        lowerMsg.includes("proposed") || 
        lowerMsg.includes("accepted") ||
        lowerMsg.includes("confirmed") ||
        lowerMsg.includes("scheduled") ||
        lowerMsg.includes("copied")) {
      return {
        bg: "bg-emerald-50",
        text: "text-emerald-800",
        border: "border-emerald-200",
        icon: CheckCircle,
        iconColor: "text-emerald-600"
      };
    }
    
    // Info/Waiting messages
    if (lowerMsg.includes("waiting") || 
        lowerMsg.includes("pending") ||
        lowerMsg.includes("slot") ||
        lowerMsg.includes("partner") ||
        lowerMsg.includes("propose")) {
      return {
        bg: "bg-blue-50",
        text: "text-blue-800",
        border: "border-blue-200",
        icon: Info,
        iconColor: "text-blue-600"
      };
    }
    
    // Warning messages
    if (lowerMsg.includes("adjusted") || 
        lowerMsg.includes("changed") ||
        lowerMsg.includes("before") ||
        lowerMsg.includes("after")) {
      return {
        bg: "bg-amber-50",
        text: "text-amber-800",
        border: "border-amber-200",
        icon: AlertCircle,
        iconColor: "text-amber-600"
      };
    }
    
    // Error/Rejection messages
    if (lowerMsg.includes("error") || 
        lowerMsg.includes("failed") ||
        lowerMsg.includes("reject") ||
        lowerMsg.includes("cannot") ||
        lowerMsg.includes("unable")) {
      return {
        bg: "bg-red-50",
        text: "text-red-800",
        border: "border-red-200",
        icon: AlertCircle,
        iconColor: "text-red-600"
      };
    }
    
    // Default to info style
    return {
      bg: "bg-slate-50",
      text: "text-slate-800",
      border: "border-slate-200",
      icon: Info,
      iconColor: "text-slate-600"
    };
  };

  // Fetch proposals when a pair is selected and poll for updates
  useEffect(() => {
    const fetch = async () => {
      setCurrentProposals({ mine: [], partner: [], common: null });
      setSelectedToAccept("");
      if (!selectedPair) return;
      try {
        const res = await api.proposeSlots(selectedPair._id, []);
        setCurrentProposals(res);
        setShowPastDropdown(false);
      } catch {
        // ignore
      }
    };
    fetch();
    
    // Poll for updates every 5 seconds when a pair is selected
    if (!selectedPair) return;
    
    const pollInterval = setInterval(async () => {
      try {
        const res = await api.proposeSlots(selectedPair._id, []);
        setCurrentProposals(res);
      } catch {
        // ignore polling errors
      }
    }, 5000); // Poll every 5 seconds
    
    return () => clearInterval(pollInterval);
  }, [selectedPair]);

  // Close Past Time dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (!pastDropdownRef.current) return;
      if (!pastDropdownRef.current.contains(e.target)) {
        setShowPastDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
  // Helper to get current datetime for min validation
  const getCurrentMinDateTime = () => {
    const now = new Date();
    const eventStart = selectedPair?.event?.startDate ? new Date(selectedPair.event.startDate) : null;
    // Use the later of current time or event start
    const minDate = eventStart && eventStart > now ? eventStart : now;
    return minDate.toISOString();
  };

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

    const now = Date.now();
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
      setMessage("⚠️ Please select a pairing partner and add at least one time slot to continue.");
      setIsLoadingPairs(false);
      return;
    }
    
    // Check for past time slots
    const parsedSlots = isoSlots.map(s => new Date(s));
    const hasPastSlot = parsedSlots.some(d => !isNaN(d.getTime()) && d.getTime() <= now);
    if (hasPastSlot) {
      setMessage("⚠️ Cannot propose past time slots. Please select a future time.");
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
        setMessage("⚠️ One or more selected time slots are invalid. Please check and try again.");
        setIsLoadingPairs(false);
        return;
      }
      if (startBoundary && parsed.some((d) => d.getTime() < startBoundary)) {
        setMessage("⚠️ Some time slots are before the event start time. Please adjust your selection.");
        setIsLoadingPairs(false);
        return;
      }
      if (endBoundary && parsed.some((d) => d.getTime() > endBoundary)) {
        setMessage("⚠️ Some time slots are after the event end time. Please adjust your selection.");
        setIsLoadingPairs(false);
        return;
      }
    } catch (e) {
      // ignore parsing errors handled above
    }
    if (!isInterviewer && isoSlots.length > 3) {
      setMessage("ℹ️ As an interviewee, you can suggest up to 3 alternative time slots.");
      setIsLoadingPairs(false);
      return;
    }
    try {
      const res = await api.proposeSlots(selectedPair._id, isoSlots);
      
      // Immediately update currentProposals with the response
      setCurrentProposals(res);
      
      if (res.common)
        setMessage(
          `✅ Great! A common time slot was found: ${new Date(res.common).toLocaleString()}`
        );
      else setMessage("✅ Time proposed successfully! You and the other person can both see it now.");
      
      // Refresh pairs to update status
      if (selectedEvent) {
        const pairsData = await api.listPairs(selectedEvent._id);
        const pairsWithEvent = pairsData.map((p) => ({ ...p, event: selectedEvent }));
        setPairs(prevPairs => {
          const filteredPairs = prevPairs.filter(p => p.event._id !== selectedEvent._id);
          return [...filteredPairs, ...pairsWithEvent];
        });
        const updatedPair = pairsWithEvent.find(p => p._id === selectedPair._id);
        if (updatedPair) setSelectedPair(updatedPair);
      }
    } catch (err) {
      setMessage(err.message);
    } finally {
      setIsLoadingPairs(false);
    }
  };

  const addSlot = () => {
    // Check if there are any empty slots
    const hasEmptySlot = slots.some(slot => !slot || slot.trim() === "");
    if (hasEmptySlot) {
      setMessage("⚠️ Please complete the previous slot before adding a new one.");
      return;
    }

    // Check maximum slots limit (3 slots total)
    if (slots.length >= 3) {
      setMessage("ℹ️ You can add a maximum of 3 proposed time slots.");
      return;
    }

    // Additional check for interviewees (they can suggest up to 3 alternative slots)
    if (!isInterviewer && slots.filter(Boolean).length >= 3) {
      setMessage("ℹ️ As an interviewee, you can suggest up to 3 alternative time slots.");
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
      setMessage("✅ Time slot accepted! Both parties will see the confirmed time immediately.");
      
      // Refresh pairs for this event
      const pairsData = await api.listPairs(selectedEvent._id);
      const pairsWithEvent = pairsData.map((p) => ({ ...p, event: selectedEvent }));
      setPairs(prevPairs => {
        const filteredPairs = prevPairs.filter(p => p.event._id !== selectedEvent._id);
        return [...filteredPairs, ...pairsWithEvent];
      });
      
      // Update the selected pair with the new data
      const updatedPair = pairsWithEvent.find(p => p._id === selectedPair._id);
      if (updatedPair) {
        setSelectedPair(updatedPair);
      }
      
      // Refresh proposals
      const ro = await api.proposeSlots(selectedPair._id, []);
      setCurrentProposals(ro);
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleReject = async () => {
    if (!selectedPair || !selectedEvent) return;
    try {
      await api.rejectSlots(selectedPair._id);
      setMessage("✅ Proposal rejected successfully. The other person can now propose a new time.");
      
      // Refresh pairs for this event
      const pairsData = await api.listPairs(selectedEvent._id);
      const pairsWithEvent = pairsData.map((p) => ({ ...p, event: selectedEvent }));
      setPairs(prevPairs => {
        const filteredPairs = prevPairs.filter(p => p.event._id !== selectedEvent._id);
        return [...filteredPairs, ...pairsWithEvent];
      });
      
      setCurrentProposals({ mine: [], partner: [], common: null });
      
      // Update the selected pair with the new data
      const updatedPair = pairsWithEvent.find(p => p._id === selectedPair._id);
      if (updatedPair) {
        setSelectedPair(updatedPair);
      }
      
      // Refresh proposals
      const ro = await api.proposeSlots(selectedPair._id, []);
      setCurrentProposals(ro);
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
    <div className="bg-white rounded-lg border border-slate-200 p-3 sm:p-4 h-[calc(100vh-5rem)] sm:h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
      {/* Show stats only when no event is selected on mobile */}
      {!selectedEvent && (
        <div className="lg:hidden mb-3 sm:mb-4">
          <StatsComponent />
        </div>
      )}
      
      {/* Header with close button when event is selected */}
      {selectedEvent ? (
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-base sm:text-lg font-semibold text-slate-800">Selected Interview</h2>
          <button
            onClick={handleCloseEvent}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 transition-colors"
            title="Close and show all events"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-slate-800">Interviews</h2>
            <span className="px-2 py-0.5 bg-sky-500 text-white rounded text-xs font-medium">
              {filteredEvents.length}
            </span>
          </div>
        </>
      )}
      
      {/* Filters - Hide when event is selected */}
      {!selectedEvent && (
        <div className="mb-3 space-y-2">
          {/* Event Type Filter */}
          <div className="flex gap-1.5">
            {[
              { id: "regular", label: "Regular", color: "sky" },
              { id: "special", label: "Special", color: "purple" },
              { id: "past", label: "Past", color: "slate" }
            ].map((tab) => {
              const isActive = (tab.id === "past" && selectedKey === "past") ||
                               (tab.id !== "past" && selectedKey.startsWith(tab.id));
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (tab.id === "past") {
                      setSelectedKey("past");
                    } else {
                      setSelectedKey(`${tab.id}-all`);
                    }
                  }}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? tab.id === "regular"
                        ? "bg-gradient-to-br from-sky-500 to-sky-600 text-white shadow-md"
                        : tab.id === "special"
                        ? "bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-md"
                        : "bg-gradient-to-br from-slate-500 to-slate-600 text-white shadow-md"
                      : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:shadow-sm"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Status Filter - Only show for Regular/Special, not Past */}
          {currentType !== "past" && (
            <div className="flex gap-1.5">
              {[
                { id: "all", label: "All", icon: "●" },
                { id: "active", label: "Active", icon: "●" },
                { id: "upcoming", label: "Upcoming", icon: "●" }
              ].map((filter) => {
                const isActive = currentStatus === filter.id;
                return (
                  <button
                    key={filter.id}
                    onClick={() => {
                      const type = selectedKey.startsWith("special") ? "special" : "regular";
                      setSelectedKey(`${type}-${filter.id}`);
                    }}
                    className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-all ${
                      isActive
                        ? "bg-slate-800 text-white shadow-sm"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                    }`}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Search - Hide when event is selected */}
      {!selectedEvent && (
        <div className="relative mb-3">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-slate-500" />
          <input
            type="text"
            placeholder="Search interviews..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-7 pr-3 py-1.5 bg-slate-50 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500 text-sm"
          />
        </div>
      )}

      {/* Event List */}
      <div className="space-y-2 flex-1 overflow-y-auto pr-1">
        {selectedEvent ? (
          // Show only the selected event
          (() => {
            const event = selectedEvent;
            const active = true;
            const isUpcoming = new Date(event.startDate) > now;
            const isActive = !isUpcoming && (!event.endDate || new Date(event.endDate) > now);
            const isPast = event.endDate && new Date(event.endDate) < now;
            const isSpecial = event.isSpecial;
            
            // Get pairing info for this event
            const eventPairs = pairs.filter(p => p.event._id === event._id);
            const interviewerPair = eventPairs.find(p => getUserRoleInPair(p) === "interviewer");
            const intervieweePair = eventPairs.find(p => getUserRoleInPair(p) === "interviewee");
            
            console.log('[Dashboard] Event pair check (selected view):', { 
              eventId: event._id, 
              eventName: event.name,
              joined: event.joined,
              active,
              totalPairs: pairs.length,
              eventPairs: eventPairs.length,
              hasInterviewerPair: !!interviewerPair,
              hasIntervieweePair: !!intervieweePair,
              meId: me?.id
            });
            
            return (
              <div key={event._id} className="space-y-1">
                <button
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
                          {isSpecial && (
                            <span className="px-1.5 py-0.5 text-xs rounded bg-purple-100 text-purple-700 font-medium">
                              Special
                            </span>
                          )}
                          {!isSpecial && (
                            <span className={`px-1.5 py-0.5 text-xs rounded font-medium ${
                              event.joined
                                ? isSpecial
                                  ? "bg-purple-50 text-purple-600"
                                  : isActive 
                                  ? "bg-emerald-100 text-emerald-700" 
                                  : isPast
                                  ? "bg-slate-100 text-slate-600"
                                  : "bg-amber-100 text-amber-700"
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
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-600 flex-wrap">
                        <div className="flex items-center gap-1">
                          <Clock size={12} />
                          <span>{fmt(event.startDate)}</span>
                        </div>
                        {event.joined && (
                          <span className="flex items-center gap-1 text-emerald-600 font-medium">
                            <UserCheck size={12} />
                            Joined
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
                
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
                            ? "bg-indigo-100 border-indigo-300 text-indigo-900"
                            : "bg-white border-slate-200 hover:border-indigo-200 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <User className="w-3 h-3 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium">Mentor</div>
                            <div className="text-xs text-slate-600 mt-0.5 truncate">
                              {event.name}
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                interviewerPair.status === "completed"
                                  ? "bg-blue-100 text-blue-700"
                                  : interviewerPair.status === "scheduled"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : interviewerPair.status === "rejected"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}>
                                {interviewerPair.status === "completed" ? "Finished" : interviewerPair.status === "scheduled" ? "Scheduled" : interviewerPair.status === "rejected" ? "Rejected" : "Pending"}
                              </span>
                              <span className="text-xs text-slate-500 truncate">
                                {interviewerPair.interviewer?.name || interviewerPair.interviewer?.email || "N/A"} ➜ {interviewerPair.interviewee?.name || interviewerPair.interviewee?.email || "N/A"}
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
                            ? "bg-indigo-100 border-indigo-300 text-indigo-900"
                            : "bg-white border-slate-200 hover:border-indigo-200 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <User className="w-3 h-3 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium">Candidate</div>
                            <div className="text-xs text-slate-600 mt-0.5 truncate">
                              {event.name}
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                intervieweePair.status === "completed"
                                  ? "bg-blue-100 text-blue-700"
                                  : intervieweePair.status === "scheduled"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : intervieweePair.status === "rejected"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}>
                                {intervieweePair.status === "completed" ? "Finished" : intervieweePair.status === "scheduled" ? "Scheduled" : intervieweePair.status === "rejected" ? "Rejected" : "Pending"}
                              </span>
                              <span className="text-xs text-slate-500 truncate">
                                {intervieweePair.interviewer?.name || intervieweePair.interviewer?.email || "N/A"} ➜ {intervieweePair.interviewee?.name || intervieweePair.interviewee?.email || "N/A"}
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
          })()
        ) : filteredEvents.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-slate-500 py-6"
          >
            <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm">No interviews found</p>
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
            
            // Debug logging (can be removed in production)
            if (eventPairs.length > 0) {
              console.log(`Event ${event.name} pairs:`, eventPairs.map(p => ({
                id: p._id,
                interviewer: p.interviewer?.name || p.interviewer?.email,
                interviewee: p.interviewee?.name || p.interviewee?.email,
                status: p.status,
                userRole: getUserRoleInPair(p)
              })));
            }
            
            return (
              <div key={event._id} className="space-y-1">
                <button
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
                </button>
                
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
                            <div className="font-medium">Mentor Name</div>
                            <div className="text-xs text-slate-600 mt-0.5">
                              {event.name}
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                interviewerPair.status === "scheduled"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : interviewerPair.status === "rejected"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}>
                                {interviewerPair.status === "scheduled" ? "Scheduled" : interviewerPair.status === "rejected" ? "Rejected" : "Pending"}
                              </span>
                              <span className="text-xs text-slate-500 truncate">
                                {interviewerPair.interviewer?.name || interviewerPair.interviewer?.email || "N/A"} ➜ {interviewerPair.interviewee?.name || interviewerPair.interviewee?.email || "N/A"}
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
                            <div className="font-medium">Candidate Name</div>
                            <div className="text-xs text-slate-600 mt-0.5">
                              {event.name}
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                intervieweePair.status === "scheduled"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : intervieweePair.status === "rejected"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}>
                                {intervieweePair.status === "scheduled" ? "Scheduled" : intervieweePair.status === "rejected" ? "Rejected" : "Pending"}
                              </span>
                              <span className="text-xs text-slate-500 truncate">
                                {intervieweePair.interviewer?.name || intervieweePair.interviewer?.email || "N/A"} ➜ {intervieweePair.interviewee?.name || intervieweePair.interviewee?.email || "N/A"}
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
    <div className="space-y-3 sm:space-y-4 md:space-y-6">
      {/* Mobile Back Button */}
      <div className="lg:hidden flex items-center gap-2 -mt-2 mb-3 sm:mb-4 pb-3 border-b border-slate-200 sticky top-0 bg-white z-10">
        <button
          onClick={() => {
            setSelectedPairRole(null);
            setSelectedPair(null);
          }}
          className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 active:bg-slate-300 transition-colors touch-manipulation"
        >
          <ChevronLeft className="w-5 h-5 text-slate-700" />
        </button>
        <div className="flex-1">
          <div className="text-xs text-slate-500">Back to event details</div>
          <div className="font-medium text-slate-800 text-sm">
            {isInterviewer ? "Interviewer" : "Interviewee"} View
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center gap-3 mb-6">
        <div className="text-center">
          <h2 className="text-base sm:text-lg md:text-xl font-semibold text-slate-900 mb-3 break-words">
            <span className="text-sky-600">Mentor:</span> {selectedPair.interviewer?.name || selectedPair.interviewer?.email}
            <span className="mx-3 text-slate-400">➜</span>
            <span className="text-emerald-600">Candidate:</span> {selectedPair.interviewee?.name || selectedPair.interviewee?.email}
          </h2>

          <div className="flex flex-wrap gap-2 mb-3 justify-center">
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

      {/* Single Page Time Slot Interface */}
      <div className="space-y-6">
        {/* Default Time Slot Display */}
        <div className="bg-gradient-to-br from-indigo-50 to-sky-50 rounded-xl p-6 border border-indigo-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Interview Time Slot</h3>
            {/* Past Time Slots Button (right side) */}
            <div className="relative" ref={pastDropdownRef}>
              <button
                type="button"
                onClick={() => setShowPastDropdown(v => !v)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white hover:bg-slate-50 shadow-sm flex items-center gap-2"
              >
                Past Time Allotment
                {(() => {
                  const count = Array.isArray(currentProposals?.pastTimeSlots)
                    ? currentProposals.pastTimeSlots.length
                    : ((currentProposals?.minePastEntries || []).length + (currentProposals?.partnerPastEntries || []).length);
                  return count > 0 ? (
                    <span className="inline-flex items-center justify-center text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-white min-w-[18px]">
                      {count}
                    </span>
                  ) : null;
                })()}
              </button>
              {showPastDropdown && (
                <div className="absolute right-0 mt-2 w-80 z-10 bg-white border border-slate-200 rounded-lg shadow-md">
                  <div className="p-3">
                    <div className="text-xs font-semibold text-slate-700 mb-2">Past Time Allotment - Full History</div>
                    {(() => {
                      const entries = Array.isArray(currentProposals?.pastTimeSlots)
                        ? currentProposals.pastTimeSlots
                        : [
                            ...(currentProposals?.minePastEntries || []),
                            ...(currentProposals?.partnerPastEntries || []),
                          ].sort((a, b) => new Date(b.time) - new Date(a.time));
                      if (!entries || entries.length === 0) {
                        return (
                          <div className="text-sm text-slate-500">No past time slots available.</div>
                        );
                      }
                      const toLabel = (r) => {
                        if (!r) return 'Replaced';
                        const map = { rejected: 'Rejected', expired: 'Expired', superseded: 'Replaced', replaced: 'Replaced' };
                        return map[r] || (r.charAt(0).toUpperCase() + r.slice(1));
                      };
                      const color = (r) => {
                        if (r === 'rejected') return 'bg-red-100 text-red-700 border-red-200';
                        if (r === 'expired') return 'bg-amber-100 text-amber-800 border-amber-200';
                        return 'bg-slate-100 text-slate-700 border-slate-200';
                      };
                      return (
                        <ul className="space-y-2 max-h-64 overflow-auto">
                          {entries.map((e, idx) => (
                            <li key={`${e.time}-${idx}`} className={`text-xs px-2 py-2 rounded border flex flex-col ${color(e.reason)}`}>
                              <span className="font-medium">{new Date(e.time).toLocaleString()}</span>
                              <span className="text-[10px] uppercase tracking-wide mt-0.5 font-semibold">{toLabel(e.reason)}</span>
                            </li>
                          ))}
                        </ul>
                      );
                    })()}
                    <div className="mt-2 text-[10px] text-slate-500">Full history of all previous time slots.</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Show Scheduled/Default Time */}
          {isLocked && selectedPair?.scheduledAt ? (
            <div className="text-center py-6">
              <div className="inline-flex flex-col items-center gap-3 px-8 py-6 bg-white rounded-xl border-2 border-emerald-300 shadow-lg">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
                <div>
                  <div className="text-sm font-medium text-slate-600 mb-1">Your interview time:</div>
                  <div className="text-xl font-bold text-emerald-700">
                    {new Date(selectedPair.scheduledAt).toLocaleString()}
                  </div>
                  {bothReachedLimit && (
                    <div className="mt-2 text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded border border-slate-200">
                      ✓ Finalized after both parties used their 3 proposals
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Show partner's proposed time if exists - same single tab style */}
              {(isInterviewer ? intervieweeSlots : interviewerSlots).length > 0 ? (
                <div>
                  <div className="text-center mb-4">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 rounded-lg border border-purple-300">
                      <Clock className="w-5 h-5 text-purple-600" />
                      <span className="text-sm font-medium text-purple-900">
                        Proposed Time (by {isInterviewer ? 'Candidate' : 'Mentor'})
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-purple-200 text-purple-800 rounded-full font-semibold">
                        {partnerProposalCount}/3
                      </span>
                    </div>
                    {bothReachedLimit && (
                      <div className="mt-2 text-xs text-amber-700 bg-amber-50 px-3 py-1.5 rounded border border-amber-200 inline-block">
                        ⚠️ Both parties used all 3 proposals - this time will be finalized
                      </div>
                    )}
                  </div>
                  {(isInterviewer ? intervieweeSlots : interviewerSlots).map((s, i) => (
                    <div key={i} className="bg-white rounded-lg p-6 border-2 border-purple-300 shadow-md text-center mb-4">
                      <div className="text-sm text-slate-600 mb-2">Current proposed time:</div>
                      <div className="text-lg font-semibold text-slate-900 mb-4">
                        {new Date(s).toLocaleString()}
                      </div>
                      <div className="flex gap-3 justify-center flex-wrap">
                        <button
                          onClick={() => handleConfirm(s, "")}
                          className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg font-medium text-sm hover:from-emerald-600 hover:to-emerald-700 shadow-sm"
                        >
                          Accept This Time
                        </button>
                        <button
                          onClick={() => {
                            setShowProposeForm(true);
                          }}
                          className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg font-medium text-sm hover:from-amber-600 hover:to-amber-700 shadow-sm"
                        >
                          Change Time
                        </button>
                        <button
                          onClick={async () => {
                            await handleReject();
                          }}
                          className="px-6 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-medium text-sm hover:from-red-600 hover:to-red-700 shadow-sm"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Show default time or my pending proposal */
                <div>
                  {(isInterviewer ? interviewerSlots : intervieweeSlots).length > 0 ? (
                    /* I have proposed - show as "Proposed Time" (visible to both sides) */
                    <div className="text-center py-6">
                      <div className="text-center mb-4">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 rounded-lg border border-purple-300">
                          <Clock className="w-5 h-5 text-purple-600" />
                          <span className="text-sm font-medium text-purple-900">
                            Proposed Time (Waiting for confirmation)
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-purple-200 text-purple-800 rounded-full font-semibold">
                            {myProposalCount}/3
                          </span>
                        </div>
                        {bothReachedLimit && (
                          <div className="mt-2 text-xs text-amber-700 bg-amber-50 px-3 py-1.5 rounded border border-amber-200 inline-block">
                            ⚠️ Both parties used all 3 proposals - this time will be finalized
                          </div>
                        )}
                      </div>
                      <div className="bg-white rounded-lg p-6 border-2 border-purple-300 shadow-md text-center mb-4">
                        <div className="text-sm text-slate-600 mb-2">Current proposed time:</div>
                        <div className="text-lg font-semibold text-slate-900 mb-4">
                          {new Date((isInterviewer ? interviewerSlots : intervieweeSlots)[0]).toLocaleString()}
                        </div>
                        <div className="flex gap-3 justify-center flex-wrap">
                          <button
                            onClick={() => handleConfirm((isInterviewer ? interviewerSlots : intervieweeSlots)[0], "")}
                            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg font-medium text-sm hover:from-emerald-600 hover:to-emerald-700 shadow-sm"
                          >
                            Accept This Time
                          </button>
                          <button
                            onClick={() => setShowProposeForm(true)}
                            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg font-medium text-sm hover:from-amber-600 hover:to-amber-700 shadow-sm"
                          >
                            Change Time
                          </button>
                          <button
                            onClick={async () => {
                              await handleReject();
                            }}
                            className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-medium text-sm hover:from-red-600 hover:to-red-700 shadow-sm"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* No proposals yet - show default time slot if available and not expired */
                    <div className="text-center py-6">
                      {selectedPair?.defaultTimeSlot ? (
                        selectedPair.defaultTimeExpired ? (
                          /* Default time has expired */
                          <div>
                            <div className="inline-flex flex-col items-center gap-3 px-8 py-6 bg-red-50 rounded-xl border-2 border-red-300">
                              <Clock className="w-8 h-8 text-red-600" />
                              <div>
                                <div className="text-sm font-medium text-red-900 mb-2">Default time slot has expired</div>
                                <div className="text-sm text-red-700 line-through">
                                  {new Date(selectedPair.defaultTimeSlot).toLocaleString()}
                                </div>
                                <div className="text-xs text-red-600 mt-2">Please propose a new time to schedule your interview</div>
                              </div>
                            </div>
                            <button
                              onClick={() => setShowProposeForm(true)}
                              className="mt-4 px-6 py-2.5 bg-gradient-to-r from-sky-500 to-sky-600 text-white rounded-lg font-medium text-sm hover:from-sky-600 hover:to-sky-700 shadow-sm"
                            >
                              Propose New Time
                            </button>
                          </div>
                        ) : (
                          /* Valid future default time */
                          <div>
                            <div className="text-center mb-4">
                              <div className="inline-flex items-center gap-2 px-4 py-2 bg-sky-100 rounded-lg border border-sky-300">
                                <Clock className="w-5 h-5 text-sky-600" />
                                <span className="text-sm font-medium text-sky-900">
                                  Default Time Slot Assigned
                                </span>
                              </div>
                            </div>
                            <div className="bg-white rounded-lg p-6 border-2 border-sky-200 shadow-md text-center mb-4">
                              <div className="text-sm text-slate-600 mb-2">Your scheduled time:</div>
                              <div className="text-lg font-semibold text-slate-900 mb-4">
                                {new Date(selectedPair.defaultTimeSlot).toLocaleString()}
                              </div>
                              <div className="flex gap-3 justify-center flex-wrap">
                                <button
                                  onClick={() => handleConfirm(selectedPair.defaultTimeSlot, "")}
                                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg font-medium text-sm hover:from-emerald-600 hover:to-emerald-700 shadow-sm"
                                >
                                  Accept Default Time
                                </button>
                                <button
                                  onClick={() => setShowProposeForm(true)}
                                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg font-medium text-sm hover:from-amber-600 hover:to-amber-700 shadow-sm"
                                >
                                  Change Time
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      ) : (
                        <div>
                          <div className="inline-flex items-center gap-2 px-6 py-4 bg-slate-100 rounded-lg border border-slate-300 mb-4">
                            <Clock className="w-5 h-5 text-slate-500" />
                            <div className="text-sm font-medium text-slate-700">
                              No time slot scheduled yet
                            </div>
                          </div>
                          <button
                            onClick={() => setShowProposeForm(true)}
                            className="px-6 py-2.5 bg-gradient-to-r from-sky-500 to-sky-600 text-white rounded-lg font-medium text-sm hover:from-sky-600 hover:to-sky-700 shadow-sm"
                          >
                            Propose a time slot
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Propose New Time Form (shown when user clicks "Propose a new time") */}
        {showProposeForm && !isLocked && (
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-slate-900">
                  {isInterviewer ? 'Propose Time Slot' : 'Suggest Alternative Time'}
                </h3>
                <div className="text-xs text-slate-600 mt-1">
                  {myRemainingProposals > 0 ? (
                    <span>You have <span className="font-semibold text-sky-600">{myRemainingProposals}</span> proposal{myRemainingProposals !== 1 ? 's' : ''} remaining</span>
                  ) : (
                    <span className="text-amber-600 font-medium">⚠️ This is your last proposal (3/3 used)</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  setShowProposeForm(false);
                  setSlots([""]);
                }}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
                {slots.map((s, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <DateTimePicker
                      value={s}
                      onChange={(isoDateTime) => {
                        const v = isoDateTime;
                        
                        // Check if selected time is in the past
                        if (v) {
                          const selectedTime = new Date(v).getTime();
                          const currentTime = Date.now();
                          if (selectedTime <= currentTime) {
                            setMessage("⚠️ Cannot select past time. Please choose a future time.");
                            return;
                          }
                        }
                        
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
                            "⚠️ Selected time was before the event start. It has been adjusted to the event start time."
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
                            "⚠️ Selected time was after the event end. It has been adjusted to the event end time."
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
                      min={getCurrentMinDateTime()}
                      max={selectedPair?.event?.endDate}
                      placeholder="Select interview time"
                      className="flex-1 text-sm"
                      disabled={isLocked}
                    />
                    {!isLocked && slots.length > 1 && (
                      <button
                        onClick={() => removeSlot(idx)}
                        className="p-2 rounded bg-red-50 text-red-600 hover:bg-red-100 active:bg-red-200 transition-colors touch-manipulation"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mt-4">
                <button
                  onClick={addSlot}
                  disabled={
                    slots.length >= 3 || slots.some(slot => !slot || slot.trim() === "")
                  }
                  className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-lg text-slate-700 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                >
                  <PlusCircle className="w-4 h-4" />
                  Add Time Slot
                </button>
                <div className="text-xs text-slate-600 text-center sm:text-left">
                  {slots.some(slot => !slot || slot.trim() === "") ? (
                    <span className="text-amber-600">Complete the current slot to add more</span>
                  ) : slots.length >= 3 ? (
                    <span className="text-slate-500">Maximum 3 slots reached</span>
                  ) : isInterviewer ? (
                    "Add multiple available time slots (max 3)"
                  ) : (
                    `You may propose up to 3 alternative time slots (${slots.length}/3)`
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => {
                    setShowProposeForm(false);
                    setSlots([""]);
                    setMessage("");
                  }}
                  className="flex-1 px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    await handlePropose();
                    setShowProposeForm(false);
                    setSlots([""]);
                  }}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-sky-500 to-sky-600 text-white rounded-lg font-medium text-sm hover:from-sky-600 hover:to-sky-700"
                >
                  Propose Time
                </button>
              </div>

              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
                <p className="text-xs text-blue-800">
                  <Info className="w-4 h-4 inline mr-1" />
                  The other person will respond to your proposed time soon.
                </p>
              </div>
            </div>
        )}
      </div>

      {isLocked && selectedPair.meetingLink && (
        <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
            <span className="font-semibold text-indigo-900 text-sm">
              Meeting Details
            </span>
            <span className="text-xs text-slate-600 bg-white px-2 py-1 rounded border w-fit">
              Jitsi Meet
            </span>
          </div>
          
          {isCompleted ? (
            <div className="bg-blue-100 border border-blue-300 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-blue-800 mb-2">
                <CheckCircle className="w-5 h-5" />
                <span className="font-semibold">Session Completed</span>
              </div>
              <p className="text-sm text-blue-700">
                This interview session has been finished. Feedback has been submitted.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-2">
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
                  className={`w-full border rounded-lg px-3 py-2 text-sm font-medium break-all ${
                    meetingLinkEnabled
                      ? "bg-white border-indigo-300 text-slate-900"
                      : "bg-slate-100 border-slate-300 text-slate-500"
                  }`}
                />
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => {
                      if (!meetingLinkEnabled) return;
                      window.open(selectedPair.meetingLink, "_blank");
                      startFeedbackCountdown(selectedPair);
                    }}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors touch-manipulation ${
                      meetingLinkEnabled
                        ? "bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white"
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
                      setMessage("✅ Meeting link copied to clipboard successfully!");
                      startFeedbackCountdown(selectedPair);
                    }}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors touch-manipulation ${
                      meetingLinkEnabled
                        ? "bg-white border border-indigo-300 hover:bg-indigo-50 active:bg-indigo-100 text-indigo-700"
                        : "bg-slate-100 border border-slate-300 text-slate-400 cursor-not-allowed"
                    }`}
                    disabled={!meetingLinkEnabled}
                  >
                    Copy Link
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className={`flex items-start gap-2 text-sm p-3 rounded-lg ${getMessageStyle(message).bg} ${getMessageStyle(message).text} border ${getMessageStyle(message).border}`}
          >
            {(() => {
              const Icon = getMessageStyle(message).icon;
              return <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${getMessageStyle(message).iconColor}`} />;
            })()}
            <span className="flex-1">{message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Disclaimer */}
      <div className="mt-4 pt-4 border-t border-slate-200">
        <p className="text-xs text-slate-500 text-center italic">
          <Info className="w-3 h-3 inline mr-1" />
          Mentor proposes available time slots. Candidate can accept a proposed slot or suggest up to 3 alternative time slots for consideration. All interview scheduling and joining must take place between 10:00 AM and 10:00 PM.
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
          <div className="lg:hidden flex items-center gap-2 mb-3 sm:mb-4 p-2.5 sm:p-3 bg-white border-b border-slate-200 sticky top-0 z-10">
            <button
              onClick={() => {
                setSelectedEvent(null);
                setSelectedPairRole(null);
                setSelectedPair(null);
              }}
              className="p-1.5 rounded bg-slate-100 hover:bg-slate-200 active:bg-slate-300 transition-colors"
            >
              <ChevronLeft size={18} className="text-slate-700" />
            </button>
            <h2 className="text-base sm:text-lg font-semibold text-slate-800 truncate">{selectedEvent.name}</h2>
          </div>

      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
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
          </div>
          
          <h2 className="hidden lg:block text-lg sm:text-xl font-semibold text-slate-800 mb-2 sm:mb-3">
            {selectedEvent.name}
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2 sm:mb-3">
            <div className="flex items-center gap-2 p-2 bg-slate-50 rounded">
              <Clock className="w-4 h-4 text-sky-500 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-xs text-slate-500">Start Time</div>
                <div className="font-medium text-slate-800 text-sm truncate">{fmt(selectedEvent.startDate)}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-slate-50 rounded">
              <Clock className="w-4 h-4 text-indigo-500 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-xs text-slate-500">End Time</div>
                <div className="font-medium text-slate-800 text-sm truncate">{fmt(selectedEvent.endDate)}</div>
              </div>
            </div>
          </div>
          
          <p className="text-slate-700 text-sm bg-slate-50 p-3 rounded">
            {selectedEvent.description}
          </p>
        </div>
        
        <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto">
          {!selectedEvent.joined && (() => {
            const now = new Date();
            const joinDisabled = selectedEvent.joinDisabled || (selectedEvent.joinDisableTime && now > new Date(selectedEvent.joinDisableTime));
            return (
              <button
                onClick={handleJoinEvent}
                disabled={joinDisabled}
                className={`w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-lg font-medium text-white text-sm transition-colors ${
                  joinDisabled ? "bg-slate-400 cursor-not-allowed" : "bg-sky-500 hover:bg-sky-600 active:bg-sky-700"
                }`}
              >
                {joinDisabled ? "Participation Closed" : "Join Interview"}
              </button>
            );
          })()}
        </div>
      </div>

      {/* Template Section */}
      {selectedEvent && (
        <div className="bg-sky-50 rounded-lg p-3 border border-sky-200 mb-3">
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
        </div>
      )}

      {/* Mobile Pairing Section - Show Interviewer/Interviewee tabs on mobile only */}
      {selectedEvent && selectedEvent.joined && (
        (() => {
          // Get pairing info for this event
          const eventPairs = pairs.filter(p => p.event._id === selectedEvent._id);
          const interviewerPair = eventPairs.find(p => getUserRoleInPair(p) === "interviewer");
          const intervieweePair = eventPairs.find(p => getUserRoleInPair(p) === "interviewee");
          
          // Only show if there are pairs
          if (!interviewerPair && !intervieweePair) return null;
          
          return (
            <div className="lg:hidden bg-indigo-50 rounded-lg p-3 border border-indigo-200 mb-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-indigo-500 rounded">
                  <Users className="w-3 h-3 text-white" />
                </div>
                <h3 className="font-medium text-slate-800 text-sm">Your Pairing Details</h3>
              </div>
              <p className="text-slate-700 text-xs mb-3">
                View your role as Mentor or Candidate and manage scheduling.
              </p>
              
              {/* Interviewer/Interviewee Tabs for Mobile */}
              <div className="space-y-2">
                {interviewerPair && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (selectedPairRole !== "interviewer" || selectedPair?._id !== interviewerPair._id) {
                        setSelectedPairRole("interviewer");
                        setSelectedPair(interviewerPair);
                      }
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all border-2 touch-manipulation ${
                      selectedPairRole === "interviewer" && selectedPair?._id === interviewerPair._id
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-lg"
                        : "bg-white border-indigo-200 hover:border-indigo-400 text-slate-700 hover:bg-indigo-50 active:bg-indigo-100"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <User className={`w-4 h-4 ${selectedPairRole === "interviewer" && selectedPair?._id === interviewerPair._id ? 'text-white' : 'text-indigo-600'}`} />
                      <div className="flex-1">
                        <div className="font-semibold">Mentor Name</div>
                        <div className="text-xs mt-1 opacity-90">
                          {interviewerPair.interviewer?.name || interviewerPair.interviewer?.email || "N/A"} ➜ {interviewerPair.interviewee?.name || interviewerPair.interviewee?.email || "N/A"}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            interviewerPair.status === "scheduled"
                              ? selectedPairRole === "interviewer" && selectedPair?._id === interviewerPair._id
                                ? "bg-white/20 text-white"
                                : "bg-emerald-100 text-emerald-700"
                              : interviewerPair.status === "rejected"
                              ? selectedPairRole === "interviewer" && selectedPair?._id === interviewerPair._id
                                ? "bg-white/20 text-white"
                                : "bg-red-100 text-red-700"
                              : selectedPairRole === "interviewer" && selectedPair?._id === interviewerPair._id
                                ? "bg-white/20 text-white"
                                : "bg-amber-100 text-amber-700"
                          }`}>
                            {interviewerPair.status === "scheduled" ? "Scheduled" : interviewerPair.status === "rejected" ? "Rejected" : "Pending"}
                          </span>
                        </div>
                      </div>
                      <ChevronLeft className={`w-5 h-5 rotate-180 ${selectedPairRole === "interviewer" && selectedPair?._id === interviewerPair._id ? 'text-white' : 'text-slate-400'}`} />
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
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all border-2 touch-manipulation ${
                      selectedPairRole === "interviewee" && selectedPair?._id === intervieweePair._id
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-lg"
                        : "bg-white border-indigo-200 hover:border-indigo-400 text-slate-700 hover:bg-indigo-50 active:bg-indigo-100"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <User className={`w-4 h-4 ${selectedPairRole === "interviewee" && selectedPair?._id === intervieweePair._id ? 'text-white' : 'text-indigo-600'}`} />
                      <div className="flex-1">
                        <div className="font-semibold">Candidate Name</div>
                        <div className="text-xs mt-1 opacity-90">
                          {intervieweePair.interviewer?.name || intervieweePair.interviewer?.email || "N/A"} ➜ {intervieweePair.interviewee?.name || intervieweePair.interviewee?.email || "N/A"}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            intervieweePair.status === "scheduled"
                              ? selectedPairRole === "interviewee" && selectedPair?._id === intervieweePair._id
                                ? "bg-white/20 text-white"
                                : "bg-emerald-100 text-emerald-700"
                              : intervieweePair.status === "rejected"
                              ? selectedPairRole === "interviewee" && selectedPair?._id === intervieweePair._id
                                ? "bg-white/20 text-white"
                                : "bg-red-100 text-red-700"
                              : selectedPairRole === "interviewee" && selectedPair?._id === intervieweePair._id
                                ? "bg-white/20 text-white"
                                : "bg-amber-100 text-amber-700"
                          }`}>
                            {intervieweePair.status === "scheduled" ? "Scheduled" : intervieweePair.status === "rejected" ? "Rejected" : "Pending"}
                          </span>
                        </div>
                      </div>
                      <ChevronLeft className={`w-5 h-5 rotate-180 ${selectedPairRole === "interviewee" && selectedPair?._id === intervieweePair._id ? 'text-white' : 'text-slate-400'}`} />
                    </div>
                  </button>
                )}
              </div>
              
              <p className="text-xs text-slate-600 mt-3 p-2 bg-white rounded border border-indigo-100">
                <Info className="w-3 h-3 inline mr-1" />
                Tap a role to view scheduling details and propose time slots.
              </p>
            </div>
          );
        })()
      )}

      {/* Join Message */}
      <AnimatePresence>
        {joinMsg && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className={`p-3 rounded-lg text-sm font-medium ${getMessageStyle(joinMsg).bg} ${getMessageStyle(joinMsg).text} border ${getMessageStyle(joinMsg).border}`}
          >
            <div className="flex items-center justify-center gap-2">
              {(() => {
                const Icon = getMessageStyle(joinMsg).icon;
                return <Icon className={`w-4 h-4 ${getMessageStyle(joinMsg).iconColor}`} />;
              })()}
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
                    You cannot join this interview because it was created before your registration.
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

  const Placeholder = () => {
    const [currentTipIndex, setCurrentTipIndex] = useState(0);
    
    const interviewTips = [
      "Practice interviews help you answer questions confidently and clearly.",
      "Regular practice builds muscle memory for technical problem-solving under pressure.",
      "Get comfortable with the interview format before the real opportunity comes.",
      "Receive constructive feedback to identify and improve your weak areas.",
      "Build confidence by experiencing interview scenarios in a safe environment.",
      "Learn to manage interview anxiety through repeated exposure and practice.",
      "Develop better communication skills by explaining your thought process clearly.",
      "Practice makes perfect - each practice interview brings you closer to success.",
      "Understand common interview patterns and how to approach different question types.",
      "Improve your ability to think aloud and collaborate with interviewers.",
      "Master the art of asking clarifying questions and handling ambiguity.",
      "Transform interview stress into excitement through consistent preparation."
    ];

    useEffect(() => {
      const interval = setInterval(() => {
        setCurrentTipIndex((prev) => (prev + 1) % interviewTips.length);
      }, 5000);
      return () => clearInterval(interval);
    }, [interviewTips.length]);

    return (
      <div className="flex-1 flex flex-col p-6 sm:p-8">
        {/* Welcome Message */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">
            Welcome back, {user?.name || me?.name || "Student"}! 👋
          </h1>
          <p className="text-slate-600 text-sm sm:text-base">
            Ready to ace your next interview? Select an interview from the left to get started.
          </p>
        </motion.div>

        {/* Animated Tips Section */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-20 h-20 mb-6 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg"
          >
            <BookOpen className="w-10 h-10 text-white" />
          </motion.div>
          
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-8 text-center">
            Interview Sessions
          </h2>

          {/* Rotating Tips */}
          <div className="w-full max-w-2xl min-h-[80px] flex items-center justify-center mb-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTipIndex}
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.5 }}
                className="w-full"
              >
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-l-4 border-indigo-500 p-4 sm:p-6 rounded-r-lg shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">💡</span>
                    </div>
                    <p className="text-slate-700 text-sm sm:text-base leading-relaxed flex-1">
                      {interviewTips[currentTipIndex]}
                    </p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Stats */}
          <div className="w-full max-w-2xl">
            <StatsComponent />
          </div>
        </div>
      </div>
    );
  };

  return (
    <RequirePasswordChange user={user}>
      <div className="min-h-screen w-full bg-slate-50 flex flex-col pt-16">
        <div className="flex-1 w-full mx-auto px-2 sm:px-4 py-2 sm:py-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-3">
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`${selectedEvent ? 'hidden' : 'block'} lg:block lg:col-span-3`}
            >
              <EventList />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`${selectedEvent ? 'block' : 'hidden'} lg:block lg:col-span-9`}
            >
              <div className="bg-white rounded-lg border border-slate-200 p-2 sm:p-4 h-[calc(100vh-5rem)] sm:h-[calc(100vh-4rem)] flex flex-col overflow-auto">
                {selectedEvent ? <EventDetails /> : <Placeholder />}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </RequirePasswordChange>
  );
}