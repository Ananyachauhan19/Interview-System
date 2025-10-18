/* eslint-disable no-unused-vars */
import { useEffect, useMemo, useState } from "react";
import { api } from "../utils/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle,
  AlertCircle,
  Clock,
  Users,
  PlusCircle,
  X,
  User,
  UserCheck,
} from "lucide-react";

export default function PairingAndScheduling() {
  const [events, setEvents] = useState([]);
  const [pairs, setPairs] = useState([]);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
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

  useEffect(() => {
    const loadData = async () => {
      try {
        const evs = await api.listEvents();
        setEvents(evs);
        const allPairs = [];
        for (const ev of evs) {
          const prs = await api.listPairs(ev._id);
          allPairs.push(...prs.map((p) => ({ ...p, event: ev })));
        }
        setPairs(allPairs);
      } catch (err) {
        console.error(err);
        setMessage("Failed to load pairs.");
      }
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
    };
    loadData();
  }, []);

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

  const handlePropose = async () => {
    setMessage("");
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
      // If value looks like an ISO (ends with Z or includes timezone), try Date parse
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
      return;
    }
    // Validate slots against event boundaries
    try {
      const ev = selectedPair.event || {};
      const startBoundary = ev.startDate
        ? new Date(ev.startDate).getTime()
        : null;
      const endBoundary = ev.endDate ? new Date(ev.endDate).getTime() : null;
      const parsed = isoSlots.map((s) => new Date(s));
      if (parsed.some((d) => isNaN(d.getTime()))) {
        setMessage("One or more slots are invalid");
        return;
      }
      if (startBoundary && parsed.some((d) => d.getTime() < startBoundary)) {
        setMessage("One or more slots are before the event start");
        return;
      }
      if (endBoundary && parsed.some((d) => d.getTime() > endBoundary)) {
        setMessage("One or more slots are after the event end");
        return;
      }
    } catch (e) {
      // ignore parsing errors handled above
    }
    if (!isInterviewer && isoSlots.length > 3) {
      setMessage("You may propose up to 3 alternative slots");
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
    if (!selectedPair) return;
    try {
      const iso = dt && dt.includes("T") ? new Date(dt).toISOString() : dt;
      await api.confirmSlot(selectedPair._id, iso, link);
      setMessage("Scheduled successfully!");
      const updated = [];
      for (const ev of events) {
        const prs = await api.listPairs(ev._id);
        updated.push(...prs.map((p) => ({ ...p, event: ev })));
      }
      setPairs(updated);
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleReject = async () => {
    if (!selectedPair) return;
    try {
      await api.rejectSlots(selectedPair._id);
      setMessage("Rejected slots. Waiting for new proposal from interviewer.");
      const updated = [];
      for (const ev of events) {
        const prs = await api.listPairs(ev._id);
        updated.push(...prs.map((p) => ({ ...p, event: ev })));
      }
      setPairs(updated);
      setCurrentProposals({ mine: [], partner: [], common: null });
    } catch (err) {
      setMessage(err.message);
    }
  };

  const getEventStatus = (event) => {
    const now = new Date();
    const start = new Date(event.startDate);
    const end = new Date(event.endDate);

    if (now >= start && now <= end) return "active";
    if (now < start) return "upcoming";
    return "completed";
  };

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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pt-16">
      <div className="flex-1 w-full mx-auto px-4 py-4">
        <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] gap-3">
          {/* Desktop Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="hidden lg:block lg:w-96"
          >
            <div className="bg-white rounded-lg border border-slate-200 p-4 h-full overflow-y-auto">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Interview Pairs
              </h2>
              {pairs.length === 0 ? (
                <div className="text-slate-500 text-sm text-center py-6">
                  No pairs found
                </div>
              ) : (
                <div className="space-y-2">
                  {pairs.map((p, idx) => {
                    const userRole = getUserRoleInPair(p);
                    const eventStatus = getEventStatus(p.event);
                    const isActive = eventStatus === "active";
                    const isUpcoming = eventStatus === "upcoming";

                    return (
                      <motion.div
                        key={p._id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={`py-2 px-3 rounded-lg border transition-colors cursor-pointer ${
                          selectedPair?._id === p._id
                            ? "border-sky-300 bg-sky-50"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                        onClick={() => setSelectedPair(p)}
                      >
                        <div className="flex items-start gap-2">
                          <div
                            className={`p-1 rounded ${
                              userRole === "interviewer"
                                ? "bg-sky-100 text-sky-600"
                                : "bg-emerald-100 text-emerald-600"
                            }`}
                          >
                            {userRole === "interviewer" ? (
                              <User className="w-3 h-3" />
                            ) : (
                              <UserCheck className="w-3 h-3" />
                            )}
                          </div>

                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-medium text-slate-900 text-sm truncate">
                                {p.event.name}
                              </p>
                              <div className="text-right space-y-3">
                                <span
                                  className={`text-xs px-2 py-0.5 rounded ${
                                    isActive
                                      ? "bg-emerald-100 text-emerald-800"
                                      : isUpcoming
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-slate-100 text-slate-700"
                                  }`}
                                >
                                  {isActive
                                    ? "Active"
                                    : isUpcoming
                                    ? "Upcoming"
                                    : "Completed"}
                                </span>
                                <span
                                  className={`text-xs px-2 py-0.5 rounded ${
                                    p.status === "scheduled"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : p.status === "rejected"
                                      ? "bg-red-100 text-red-700"
                                      : "bg-slate-100 text-slate-700"
                                  }`}
                                >
                                  {p.status || "Pending"}
                                </span>
                              </div>
                            </div>

                            <div className="mt-1">
                              <span
                                className={`text-xs px-2 py-0.5 rounded ${
                                  userRole === "interviewer"
                                    ? "bg-sky-100 text-sky-800"
                                    : "bg-emerald-100 text-emerald-800"
                                }`}
                              >
                                You are{" "}
                                {userRole === "interviewer"
                                  ? "Interviewer"
                                  : "Interviewee"}
                              </span>
                            </div>

                            <div className="text-xs text-slate-700 mt-2 truncate">
                              {p.interviewer?.name || p.interviewer?.email} ➜{" "}
                              {p.interviewee?.name || p.interviewee?.email}
                            </div>

                            {p.scheduledAt && (
                              <div className="mt-1 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-500" />
                                <span className="text-xs text-slate-600">
                                  {new Date(p.scheduledAt).toLocaleString()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>

          {/* Mobile Sidebar Toggle */}
          <div className="lg:hidden sticky top-16 z-20 bg-white border-b border-slate-200 py-3 px-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Interview Pairs
            </h2>
            <button
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              className="p-1.5 rounded bg-slate-100 hover:bg-slate-200"
            >
              {isMobileSidebarOpen ? (
                <X className="w-4 h-4 text-slate-600" />
              ) : (
                <Users className="w-4 h-4 text-sky-500" />
              )}
            </button>
          </div>

          {/* Mobile Sidebar Overlay */}
          <AnimatePresence>
            {isMobileSidebarOpen && (
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                className="lg:hidden fixed inset-0 top-28 z-30 bg-white p-4 overflow-y-auto"
              >
                <div className="space-y-2">
                  {pairs.length === 0 ? (
                    <div className="text-slate-500 text-sm text-center py-6">
                      No pairs found
                    </div>
                  ) : (
                    pairs.map((p) => {
                      const userRole = getUserRoleInPair(p);
                      const eventStatus = getEventStatus(p.event);
                      const isActive = eventStatus === "active";
                      const isUpcoming = eventStatus === "upcoming";

                      return (
                        <div
                          key={p._id}
                          className="py-2 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer"
                          onClick={() => {
                            setSelectedPair(p);
                            setIsMobileSidebarOpen(false);
                          }}
                        >
                          <div className="flex items-start gap-2">
                            <div
                              className={`p-1 rounded ${
                                userRole === "interviewer"
                                  ? "bg-sky-100 text-sky-600"
                                  : "bg-emerald-100 text-emerald-600"
                              }`}
                            >
                              {userRole === "interviewer" ? (
                                <User className="w-3 h-3" />
                              ) : (
                                <UserCheck className="w-3 h-3" />
                              )}
                            </div>

                            <div className="flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-medium text-slate-900 text-sm truncate">
                                  {p.event.name}
                                </p>
                                <div className="text-right space-y-2">
                                  <span
                                    className={`text-xs px-2 py-0.5 rounded ${
                                      isActive
                                        ? "bg-emerald-100 text-emerald-800"
                                        : isUpcoming
                                        ? "bg-amber-100 text-amber-800"
                                        : "bg-slate-100 text-slate-700"
                                    }`}
                                  >
                                    {isActive
                                      ? "Active"
                                      : isUpcoming
                                      ? "Upcoming"
                                      : "Completed"}
                                  </span>
                                  <span
                                    className={`text-xs px-2 py-0.5 rounded ${
                                      p.status === "scheduled"
                                        ? "bg-emerald-100 text-emerald-800"
                                        : p.status === "rejected"
                                        ? "bg-red-100 text-red-700"
                                        : "bg-slate-100 text-slate-700"
                                    }`}
                                  >
                                    {p.status || "Pending"}
                                  </span>
                                </div>
                              </div>

                              <div className="mt-1">
                                <span
                                  className={`text-xs px-2 py-0.5 rounded ${
                                    userRole === "interviewer"
                                      ? "bg-sky-100 text-sky-800"
                                      : "bg-emerald-100 text-emerald-800"
                                  }`}
                                >
                                  You are{" "}
                                  {userRole === "interviewer"
                                    ? "Interviewer"
                                    : "Interviewee"}
                                </span>
                              </div>

                              <div className="text-xs text-slate-700 mt-2 truncate">
                                {p.interviewer?.name || p.interviewer?.email} ➜{" "}
                                {p.interviewee?.name || p.interviewee?.email}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1"
          >
            <div className="bg-white rounded-lg border border-slate-200 p-6 h-full overflow-y-auto">
              {selectedPair ? (
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
                            getEventStatus(selectedPair.event) === "active"
                              ? "bg-emerald-100 text-emerald-800"
                              : getEventStatus(selectedPair.event) ===
                                "upcoming"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          Event:{" "}
                          {getEventStatus(selectedPair.event)
                            .charAt(0)
                            .toUpperCase() +
                            getEventStatus(selectedPair.event).slice(1)}
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
                      onClick={() => setSelectedPair(null)}
                      className="p-1.5 rounded bg-slate-100 hover:bg-slate-200 lg:hidden"
                    >
                      <X className="w-4 h-4 text-slate-600" />
                    </button>
                  </div>

                  <p className="text-sm text-slate-700 leading-relaxed">
                    Interviewer proposes available time slots. Interviewee can accept a proposed slot 
                    or suggest up to 3 alternative time slots for consideration.
                  </p>

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
                    {/* Date Input Section - Reduced Width */}
                    <div className="max-w-md space-y-3">
                      <h3 className="font-medium text-slate-900 text-sm">
                        Proposed Time Slots
                      </h3>
                      {slots.map((s, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="datetime-local"
                            value={s}
                            onChange={(e) => {
                              const v = e.target.value;
                              // clamp to event window if available
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
                            min={
                              selectedPair?.event?.startDate
                                ? (function (ev) {
                                    const d = new Date(ev);
                                    const pad = (n) => String(n).padStart(2, "0");
                                    const yyyy = d.getFullYear();
                                    const mm = pad(d.getMonth() + 1);
                                    const dd = pad(d.getDate());
                                    const hh = pad(d.getHours());
                                    const mi = pad(d.getMinutes());
                                    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
                                  })(selectedPair.event.startDate)
                                : undefined
                            }
                            max={
                              selectedPair?.event?.endDate
                                ? (function (ev) {
                                    const d = new Date(ev);
                                    const pad = (n) => String(n).padStart(2, "0");
                                    const yyyy = d.getFullYear();
                                    const mm = pad(d.getMonth() + 1);
                                    const dd = pad(d.getDate());
                                    const hh = pad(d.getHours());
                                    const mi = pad(d.getMinutes());
                                    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
                                  })(selectedPair.event.endDate)
                                : undefined
                            }
                            className="flex-1 bg-white border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-slate-800 text-sm w-full"
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
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <Users className="w-16 h-16 text-sky-500 mb-4" />
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">
                    Select an Interview Pair
                  </h3>
                  <p className="text-slate-600 text-sm max-w-md">
                    Choose an interview pair from the sidebar to view details, 
                    propose time slots, and manage scheduling.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}