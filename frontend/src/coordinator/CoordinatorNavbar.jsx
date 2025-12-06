import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Menu, X, Users, CalendarDays, User, Lock, ChevronDown, LayoutDashboard } from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "../utils/api";

export function CoordinatorNavbar() {
  const location = useLocation();
  const [active, setActive] = useState(location.pathname);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [coordinatorName, setCoordinatorName] = useState(localStorage.getItem("coordinatorName") || "Coordinator");
  const [coordinatorEmail, setCoordinatorEmail] = useState(localStorage.getItem("coordinatorEmail") || "");

  useEffect(() => {
    async function fetchProfile() {
      const existingToken = localStorage.getItem("token");
      if (!existingToken) return;
      try {
        const data = await api.me();
        if (data && data.email) {
          setCoordinatorEmail(data.email);
          localStorage.setItem("coordinatorEmail", data.email);
        }
        if (data && data.name) {
          setCoordinatorName(data.name);
          localStorage.setItem("coordinatorName", data.name);
        }
      } catch (err) {
        console.warn("Coordinator profile fetch failed:", err?.message || err);
      }
    }
    fetchProfile();
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
    setIsProfileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isProfileOpen && !event.target.closest(".profile-container")) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isProfileOpen]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("coordinatorName");
    localStorage.removeItem("coordinatorEmail");
    window.location.href = "/";
  };

  const navItems = [
    { path: "/coordinator", label: "Dashboard", Icon: LayoutDashboard },
    { path: "/coordinator/event/create", label: "Create Event", Icon: CalendarDays },
    { path: "/coordinator/students", label: "My Students", Icon: Users },
  ];

  return (
    <motion.nav
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-gray-200 bg-white shadow-sm"
    >
      <div className="w-full flex items-center justify-between h-16 px-4 sm:px-6">
        <motion.div className="hidden sm:flex items-center" whileHover={{ scale: 1.02 }}>
          <img src="/images/logo.png" alt="PeerPrep Logo" className="w-auto object-contain" style={{ height: '120px' }} />
        </motion.div>

        <div className="flex-1 flex justify-center sm:hidden">
          <img src="/images/logo.png" alt="PeerPrep Logo" className="w-auto object-contain" style={{ height: '99px' }} />
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1">
            {navItems.map(({ path, label, Icon }) => {
              const isActive = location.pathname === path;
              return (
                <Link key={path} to={path} onClick={() => setActive(path)}>
                  <motion.div
                    whileHover={{ y: -2, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors mx-1 ${
                      isActive ? "bg-sky-50 text-sky-600" : "text-gray-600 hover:text-sky-500 hover:bg-sky-50"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-medium text-sm">{label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="absolute inset-0 border-2 border-white/40 rounded-xl"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </motion.div>
                </Link>
              );
            })}

            <div className="relative ml-3 profile-container">
              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-50 hover:bg-sky-50 text-gray-700 transition-all duration-200 border border-gray-200"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white font-semibold text-sm">
                  {coordinatorName.charAt(0).toUpperCase()}
                </div>
                <div className="text-left hidden lg:block">
                  <div className="font-semibold text-sm text-slate-800">{coordinatorName}</div>
                  <div className="text-xs text-slate-500">Coordinator</div>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
              </motion.button>

              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50"
                  >
                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-3 border-b border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold">
                          {coordinatorName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-900 truncate">{coordinatorName}</div>
                          <div className="text-xs text-slate-600 truncate">{coordinatorEmail}</div>
                        </div>
                      </div>
                    </div>

                    <div className="py-2">
                      <Link
                        to="/student/change-password"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-sky-50 transition-colors group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center group-hover:bg-sky-100">
                          <Lock className="w-4 h-4 text-sky-600" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">Change Password</div>
                          <div className="text-xs text-slate-500">Update your password</div>
                        </div>
                      </Link>

                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-700 hover:bg-red-50 transition-colors group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center group-hover:bg-red-100">
                          <LogOut className="w-4 h-4 text-red-600" />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="text-sm font-medium text-red-600">Logout</div>
                          <div className="text-xs text-slate-500">Sign out of your account</div>
                        </div>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="relative profile-container md:hidden">
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500 text-white font-semibold text-sm shadow-md"
            >
              {coordinatorName.charAt(0).toUpperCase()}
            </motion.button>

            <AnimatePresence>
              {isProfileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50"
                >
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-3 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold">
                        {coordinatorName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-900 truncate">{coordinatorName}</div>
                        <div className="text-xs text-slate-600 truncate">{coordinatorEmail}</div>
                      </div>
                    </div>
                  </div>

                  <div className="py-2">
                    <Link
                      to="/student/change-password"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-sky-50 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center group-hover:bg-sky-100">
                        <Lock className="w-4 h-4 text-sky-600" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">Change Password</div>
                        <div className="text-xs text-slate-500">Update your password</div>
                      </div>
                    </Link>

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-700 hover:bg-red-50 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center group-hover:bg-red-100">
                        <LogOut className="w-4 h-4 text-red-600" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium text-red-600">Logout</div>
                        <div className="text-xs text-slate-500">Sign out of your account</div>
                      </div>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 border border-gray-200"
          >
            {isMenuOpen ? <X className="text-gray-700 w-5 h-5" /> : <Menu className="text-gray-700 w-5 h-5" />}
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              className="md:hidden fixed top-16 right-0 bottom-0 z-50 w-80 max-w-full bg-white rounded-l-2xl shadow-2xl p-6"
            >
              <div className="flex-1 space-y-2">
                {navItems.map(({ path, label, Icon }) => {
                  const isActive = location.pathname === path;
                  return (
                    <Link
                      key={path}
                      to={path}
                      onClick={() => setActive(path)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                        isActive ? "bg-sky-50 text-sky-600" : "text-gray-600 hover:text-sky-500 hover:bg-sky-50"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="font-medium text-sm">{label}</span>
                      {isActive && <div className="ml-auto w-2 h-2 bg-sky-500 rounded-full" />}
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
