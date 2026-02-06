/* eslint-disable no-unused-vars */
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Menu, X, Users, CalendarDays, GraduationCap, BookOpen, User, Lock, ChevronDown, UserPlus, Database, Activity } from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "../utils/api";
import DarkModeToggle from "./DarkModeToggle";

export function AdminNavbar() {
  const location = useLocation();
  const [active, setActive] = useState(location.pathname);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAddMembersOpen, setIsAddMembersOpen] = useState(false);
  const [isDatabaseOpen, setIsDatabaseOpen] = useState(false);
  const [adminName, setAdminName] = useState("Loading...");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminAvatarUrl, setAdminAvatarUrl] = useState("");

  // Fetch admin profile from backend dynamically
  useEffect(() => {
    async function fetchAdminProfile() {
      try {
        const data = await api.me();
        if (data) {
          // Set name from database
          if (data.name) {
            setAdminName(data.name);
            localStorage.setItem("adminName", data.name);
          }
          // Set email from database
          if (data.email) {
            setAdminEmail(data.email);
            localStorage.setItem("adminEmail", data.email);
          }
          // Set avatar from database
          if (Object.prototype.hasOwnProperty.call(data, "avatarUrl")) {
            setAdminAvatarUrl(data.avatarUrl || "");
            localStorage.setItem("adminAvatarUrl", data.avatarUrl || "");
          }
        }
      } catch (err) {
        // On error, fallback to localStorage or defaults
        console.warn("Admin profile fetch failed:", err?.message || err);
        setAdminName(localStorage.getItem("adminName") || "");
        setAdminEmail(localStorage.getItem("adminEmail") || "");
        setAdminAvatarUrl(localStorage.getItem("adminAvatarUrl") || "");
      }
    }
    fetchAdminProfile();
  }, []);

  // Close mobile menu and all dropdowns when route changes
  useEffect(() => {
    setIsMenuOpen(false);
    setIsProfileOpen(false);
    setIsAddMembersOpen(false);
    setIsDatabaseOpen(false);
  }, [location.pathname]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isProfileOpen && !event.target.closest(".profile-container")) {
        setIsProfileOpen(false);
      }
      if (isAddMembersOpen && !event.target.closest(".addmembers-container")) {
        setIsAddMembersOpen(false);
      }
      if (isDatabaseOpen && !event.target.closest(".database-container")) {
        setIsDatabaseOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isProfileOpen, isAddMembersOpen, isDatabaseOpen]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("isAdmin");
    localStorage.removeItem("adminName");
    localStorage.removeItem("adminEmail");
    localStorage.removeItem("adminAvatarUrl");
    window.location.href = "/";
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const addMembersItems = [
    { path: "/admin/onboarding", label: "Add Students", Icon: Users },
    { path: "/admin/coordinators", label: "Add Coordinator", Icon: User },
  ];

  const databaseItems = [
    { path: "/admin/coordinator-directory", label: "Coordinator Database", Icon: Users },
    { path: "/admin/students", label: "Student Database", Icon: User },
  ];

  // Animation variants
  const menuVariants = {
    closed: {
      x: "100%",
      opacity: 0,
      transition: { duration: 0.3, ease: "easeInOut" }
    },
    open: {
      x: 0,
      opacity: 1,
      transition: { duration: 0.3, ease: "easeInOut" }
    }
  };

  const itemHover = {
    hover: { 
      y: -2, 
      scale: 1.02,
      transition: { duration: 0.2, ease: "easeOut" }
    },
    tap: { scale: 0.98 }
  };

  const dropdownVariants = {
    closed: {
      opacity: 0,
      y: -10,
      transition: { duration: 0.2, ease: "easeInOut" }
    },
    open: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.2, ease: "easeInOut" }
    }
  };

  return (
    <motion.nav
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm"
    >
      <div className="w-full h-14 sm:h-16 px-3 sm:px-4 lg:px-6 flex items-center justify-between">
        {/* Left: Brand Logo */}
        <motion.div
          className="flex items-center min-w-0 sm:min-w-[140px] lg:min-w-[200px]"
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <img 
            src="/images/logo.png" 
            alt="PeerPrep Logo" 
            className="w-auto object-contain"
            style={{ height: '70px' }}
          />
        </motion.div>

        {/* Center: Desktop Navigation - Left aligned after logo */}
        <div className="hidden lg:flex items-center flex-1 gap-1 ml-4">
          {/* Create Interview */}
          <Link
            to="/admin/event"
            onClick={() => setActive("/admin/event")}
            className="relative"
          >
            <motion.div
              variants={itemHover}
              whileHover="hover"
              whileTap="tap"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                location.pathname === "/admin/event"
                  ? "bg-sky-50 dark:bg-gray-800 text-sky-600 dark:text-sky-400 shadow-sm"
                  : "text-gray-600 dark:text-gray-300 hover:text-sky-500 dark:hover:text-sky-400 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              <span className="font-medium text-sm whitespace-nowrap">Create Interview</span>
              
              {location.pathname === "/admin/event" && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute inset-0 border-2 border-sky-400/30 dark:border-sky-500/30 rounded-lg"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </motion.div>
          </Link>

          {/* Scheduled Interview */}
          <Link
            to="/admin/event/:id"
            onClick={() => setActive("/admin/event/:id")}
            className="relative"
          >
            <motion.div
              variants={itemHover}
              whileHover="hover"
              whileTap="tap"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                location.pathname.startsWith("/admin/event/")
                  ? "bg-sky-50 dark:bg-gray-800 text-sky-600 dark:text-sky-400 shadow-sm"
                  : "text-gray-600 dark:text-gray-300 hover:text-sky-500 dark:hover:text-sky-400 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span className="font-medium text-sm whitespace-nowrap">Scheduled Interview</span>
              
              {location.pathname.startsWith("/admin/event/") && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute inset-0 border-2 border-sky-400/30 dark:border-sky-500/30 rounded-lg"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </motion.div>
          </Link>

          {/* Members Dropdown */}
          <div className="relative addmembers-container">
            <motion.button
              variants={itemHover}
              whileHover="hover"
              whileTap="tap"
              onClick={() => {
                setIsAddMembersOpen(!isAddMembersOpen);
                setIsDatabaseOpen(false);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                isAddMembersOpen || addMembersItems.some(item => location.pathname === item.path)
                  ? "bg-sky-50 dark:bg-gray-800 text-sky-600 dark:text-sky-400 shadow-sm"
                  : "text-gray-600 dark:text-gray-300 hover:text-sky-500 dark:hover:text-sky-400 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span className="font-medium text-sm whitespace-nowrap">Add Users</span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isAddMembersOpen ? 'rotate-180' : ''}`} />
            </motion.button>

            <AnimatePresence>
              {isAddMembersOpen && (
                <motion.div
                  variants={dropdownVariants}
                  initial="closed"
                  animate="open"
                  exit="closed"
                  className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-slate-200 dark:border-gray-700 overflow-hidden z-50"
                >
                  {addMembersItems.map(({ path, label, Icon }) => (
                    <Link
                      key={path}
                      to={path}
                      onClick={() => {
                        setActive(path);
                        setIsAddMembersOpen(false);
                      }}
                      className="flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-200 hover:bg-sky-50 dark:hover:bg-gray-700 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-gray-700 flex items-center justify-center group-hover:bg-sky-100 dark:group-hover:bg-gray-600 transition-colors">
                        <Icon className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                      </div>
                      <span className="text-sm font-medium">{label}</span>
                    </Link>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Database Dropdown */}
          <div className="relative database-container">
            <motion.button
              variants={itemHover}
              whileHover="hover"
              whileTap="tap"
              onClick={() => {
                setIsDatabaseOpen(!isDatabaseOpen);
                setIsAddMembersOpen(false);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                isDatabaseOpen || databaseItems.some(item => location.pathname === item.path)
                  ? "bg-sky-50 dark:bg-gray-800 text-sky-600 dark:text-sky-400 shadow-sm"
                  : "text-gray-600 dark:text-gray-300 hover:text-sky-500 dark:hover:text-sky-400 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              <Database className="w-4 h-4" />
              <span className="font-medium text-sm whitespace-nowrap">Users</span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isDatabaseOpen ? 'rotate-180' : ''}`} />
            </motion.button>

            <AnimatePresence>
              {isDatabaseOpen && (
                <motion.div
                  variants={dropdownVariants}
                  initial="closed"
                  animate="open"
                  exit="closed"
                  className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-slate-200 dark:border-gray-700 overflow-hidden z-50"
                >
                  {databaseItems.map(({ path, label, Icon }) => (
                    <Link
                      key={path}
                      to={path}
                      onClick={() => {
                        setActive(path);
                        setIsDatabaseOpen(false);
                      }}
                      className="flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-200 hover:bg-sky-50 dark:hover:bg-gray-700 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-gray-700 flex items-center justify-center group-hover:bg-sky-100 dark:group-hover:bg-gray-600 transition-colors">
                        <Icon className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                      </div>
                      <span className="text-sm font-medium">{label}</span>
                    </Link>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Learning Modules */}
          <Link
            to="/admin/learning"
            onClick={() => setActive("/admin/learning")}
            className="relative"
          >
            <motion.div
              variants={itemHover}
              whileHover="hover"
              whileTap="tap"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                location.pathname === "/admin/learning"
                  ? "bg-sky-50 dark:bg-gray-800 text-sky-600 dark:text-sky-400 shadow-sm"
                  : "text-gray-600 dark:text-gray-300 hover:text-sky-500 dark:hover:text-sky-400 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span className="font-medium text-sm whitespace-nowrap">Learning Modules</span>
              
              {location.pathname === "/admin/learning" && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute inset-0 border-2 border-sky-400/30 dark:border-sky-500/30 rounded-lg"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </motion.div>
          </Link>

          {/* Feedback */}
          <Link
            to="/admin/feedback"
            onClick={() => setActive("/admin/feedback")}
            className="relative"
          >
            <motion.div
              variants={itemHover}
              whileHover="hover"
              whileTap="tap"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                location.pathname === "/admin/feedback"
                  ? "bg-sky-50 dark:bg-gray-800 text-sky-600 dark:text-sky-400 shadow-sm"
                  : "text-gray-600 dark:text-gray-300 hover:text-sky-500 dark:hover:text-sky-400 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span className="font-medium text-sm whitespace-nowrap">Feedback</span>
              
              {location.pathname === "/admin/feedback" && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute inset-0 border-2 border-sky-400/30 dark:border-sky-500/30 rounded-lg"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </motion.div>
          </Link>
        </div>

        {/* Right: Dark Mode Toggle & Profile with increased spacing */}
        <div className="hidden lg:flex items-center gap-2 lg:gap-3 min-w-0 lg:min-w-[200px] justify-end ml-4 lg:ml-6">
          {/* Dark Mode Toggle */}
          <DarkModeToggle />

          {/* Desktop Profile Dropdown */}
          <div className="relative profile-container">
            <motion.button
              variants={itemHover}
              whileHover="hover"
              whileTap="tap"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-sky-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-all duration-200 border border-gray-200 dark:border-gray-700"
            >
              {adminAvatarUrl ? (
                <img
                  src={adminAvatarUrl}
                  alt={adminName}
                  className="w-8 h-8 rounded-full object-cover shadow-md border border-white/20"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                  {adminName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="text-left">
                <div className="font-semibold text-sm text-slate-800 dark:text-gray-200">{adminName}</div>
                <div className="text-xs text-slate-500 dark:text-gray-400">Admin</div>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-500 dark:text-gray-400 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} />
            </motion.button>

            <AnimatePresence>
              {isProfileOpen && (
                <motion.div
                  variants={dropdownVariants}
                  initial="closed"
                  animate="open"
                  exit="closed"
                  className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-slate-200 dark:border-gray-700 overflow-hidden z-50"
                >
                  {/* Profile Header */}
                  <div className="bg-gradient-to-r from-sky-50 to-blue-50 dark:from-gray-700 dark:to-gray-700 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      {adminAvatarUrl ? (
                        <img
                          src={adminAvatarUrl}
                          alt={adminName}
                          className="w-10 h-10 rounded-full object-cover shadow-md border border-white/30"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                          {adminName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-slate-900 dark:text-gray-100 truncate">{adminName}</div>
                        <div className="text-xs text-slate-600 dark:text-gray-400 truncate">{adminEmail}</div>
                      </div>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="py-2">
                    <Link
                      to="/admin/activity"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-200 hover:bg-sky-50 dark:hover:bg-gray-700 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-gray-700 flex items-center justify-center group-hover:bg-purple-100 dark:group-hover:bg-gray-600 transition-colors">
                        <Activity className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">Activity Log</div>
                        <div className="text-xs text-slate-500 dark:text-gray-400">View your activity history</div>
                      </div>
                    </Link>

                    <Link
                      to="/admin/change-password"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-200 hover:bg-sky-50 dark:hover:bg-gray-700 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-gray-700 flex items-center justify-center group-hover:bg-sky-100 dark:group-hover:bg-gray-600 transition-colors">
                        <Lock className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">Change Password</div>
                        <div className="text-xs text-slate-500 dark:text-gray-400">Update your account password</div>
                      </div>
                    </Link>

                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-slate-700 dark:text-gray-200 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-gray-700 flex items-center justify-center group-hover:bg-red-100 dark:group-hover:bg-red-900/50 transition-colors">
                        <LogOut className="w-4 h-4 text-red-600 dark:text-red-400" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium text-red-600 dark:text-red-400">Logout</div>
                        <div className="text-xs text-slate-500 dark:text-gray-400">Sign out of your account</div>
                      </div>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Mobile: Profile + Menu Toggle */}
        <div className="lg:hidden flex items-center gap-3">
          {/* Mobile Profile */}
          <div className="relative profile-container">
            <motion.button
              variants={itemHover}
              whileHover="hover"
              whileTap="tap"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 text-white font-bold text-sm shadow-md overflow-hidden"
            >
              {adminAvatarUrl ? (
                <img
                  src={adminAvatarUrl}
                  alt={adminName}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                adminName.charAt(0).toUpperCase()
              )}
            </motion.button>

            <AnimatePresence>
              {isProfileOpen && (
                <motion.div
                  variants={dropdownVariants}
                  initial="closed"
                  animate="open"
                  exit="closed"
                  className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-slate-200 dark:border-gray-700 overflow-hidden z-50"
                >
                  {/* Profile Header */}
                  <div className="bg-gradient-to-r from-sky-50 to-blue-50 dark:from-gray-700 dark:to-gray-700 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      {adminAvatarUrl ? (
                        <img
                          src={adminAvatarUrl}
                          alt={adminName}
                          className="w-10 h-10 rounded-full object-cover shadow-md border border-white/30"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                          {adminName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-slate-900 dark:text-gray-100 truncate">{adminName}</div>
                        <div className="text-xs text-slate-600 dark:text-gray-400 truncate">{adminEmail}</div>
                      </div>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="py-2">
                    <Link
                      to="/admin/change-password"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-200 hover:bg-sky-50 dark:hover:bg-gray-700 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-gray-700 flex items-center justify-center group-hover:bg-sky-100 dark:group-hover:bg-gray-600 transition-colors">
                        <Lock className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">Change Password</div>
                        <div className="text-xs text-slate-500 dark:text-gray-400">Update your account password</div>
                      </div>
                    </Link>

                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-slate-700 dark:text-gray-200 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-gray-700 flex items-center justify-center group-hover:bg-red-100 dark:group-hover:bg-red-900/50 transition-colors">
                        <LogOut className="w-4 h-4 text-red-600 dark:text-red-400" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium text-red-600 dark:text-red-400">Logout</div>
                        <div className="text-xs text-slate-500 dark:text-gray-400">Sign out of your account</div>
                      </div>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile Menu Toggle */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={toggleMenu}
            className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200 border border-gray-200 dark:border-gray-700"
          >
            {isMenuOpen ? (
              <X className="text-gray-700 dark:text-gray-300 w-5 h-5" />
            ) : (
              <Menu className="text-gray-700 dark:text-gray-300 w-5 h-5" />
            )}
          </motion.button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={toggleMenu}
              className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            />
            
            {/* Menu Content */}
            <motion.div
              variants={menuVariants}
              initial="closed"
              animate="open"
              exit="closed"
              className="lg:hidden fixed top-16 right-0 bottom-0 z-50 w-80 max-w-full"
            >
              <div className="bg-white dark:bg-gray-900 h-full rounded-l-2xl shadow-2xl border-l border-slate-200 dark:border-gray-700 p-4 flex flex-col">
                {/* Mobile Menu Header */}
                <div className="flex items-center pb-4 mb-3 border-b border-gray-200 dark:border-gray-700">
                  <img 
                    src="/images/logo.png" 
                    alt="PeerPrep Logo" 
                    className="w-auto object-contain"
                    style={{ height: '90px' }}
                  />
                </div>

                {/* Mobile Menu Items */}
                <div className="flex-1 space-y-2">
                  {/* Create Interview */}
                  <Link
                    to="/admin/event"
                    onClick={() => setActive("/admin/event")}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md transition-colors ${
                      location.pathname === "/admin/event"
                        ? "bg-sky-50 dark:bg-gray-800 text-sky-600 dark:text-sky-400"
                        : "text-gray-600 dark:text-gray-300 hover:text-sky-500 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    <CalendarDays className="w-3.5 h-3.5" />
                    <span className="font-medium text-xs">Create Interview</span>
                    {location.pathname === "/admin/event" && (
                      <div className="ml-auto w-1.5 h-1.5 bg-sky-500 dark:bg-sky-400 rounded-full" />
                    )}
                  </Link>

                  {/* Scheduled Interview */}
                  <Link
                    to="/admin/event/:id"
                    onClick={() => setActive("/admin/event/:id")}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md transition-colors ${
                      location.pathname.startsWith("/admin/event/")
                        ? "bg-sky-50 dark:bg-gray-800 text-sky-600 dark:text-sky-400"
                        : "text-gray-600 dark:text-gray-300 hover:text-sky-500 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span className="font-medium text-xs">Scheduled Interview</span>
                    {location.pathname.startsWith("/admin/event/") && (
                      <div className="ml-auto w-1.5 h-1.5 bg-sky-500 dark:bg-sky-400 rounded-full" />
                    )}
                  </Link>

                  {/* Members Section */}
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 px-2.5 py-1 text-gray-500 dark:text-gray-400">
                      <UserPlus className="w-3 h-3" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider">Add Users</span>
                    </div>
                    {addMembersItems.map(({ path, label, Icon }) => {
                      const isActive = active === path || location.pathname === path;
                      return (
                        <Link
                          key={path}
                          to={path}
                          onClick={() => setActive(path)}
                          className={`flex items-center gap-2 pl-5 pr-2.5 py-1.5 rounded-md transition-colors ${
                            isActive
                              ? "bg-sky-50 dark:bg-gray-800 text-sky-600 dark:text-sky-400"
                              : "text-gray-600 dark:text-gray-300 hover:text-sky-500 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-gray-800"
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span className="font-medium text-xs">{label}</span>
                          {isActive && (
                            <div className="ml-auto w-1.5 h-1.5 bg-sky-500 dark:bg-sky-400 rounded-full" />
                          )}
                        </Link>
                      );
                    })}
                  </div>

                  {/* Database Section */}
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 px-2.5 py-1 text-gray-500 dark:text-gray-400">
                      <Database className="w-3 h-3" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider">Database</span>
                    </div>
                    {databaseItems.map(({ path, label, Icon }) => {
                      const isActive = active === path || location.pathname === path;
                      return (
                        <Link
                          key={path}
                          to={path}
                          onClick={() => setActive(path)}
                          className={`flex items-center gap-2 pl-5 pr-2.5 py-1.5 rounded-md transition-colors ${
                            isActive
                              ? "bg-sky-50 dark:bg-gray-800 text-sky-600 dark:text-sky-400"
                              : "text-gray-600 dark:text-gray-300 hover:text-sky-500 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-gray-800"
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span className="font-medium text-xs">{label}</span>
                          {isActive && (
                            <div className="ml-auto w-1.5 h-1.5 bg-sky-500 dark:bg-sky-400 rounded-full" />
                          )}
                        </Link>
                      );
                    })}
                  </div>

                  {/* Learning Modules */}
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <Link
                      to="/admin/learning"
                      onClick={() => setActive("/admin/learning")}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md transition-colors ${
                        location.pathname === "/admin/learning"
                          ? "bg-sky-50 dark:bg-gray-800 text-sky-600 dark:text-sky-400"
                          : "text-gray-600 dark:text-gray-300 hover:text-sky-500 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-gray-800"
                      }`}
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span className="font-medium text-xs">Learning Modules</span>
                      {location.pathname === "/admin/learning" && (
                        <div className="ml-auto w-1.5 h-1.5 bg-sky-500 dark:bg-sky-400 rounded-full" />
                      )}
                    </Link>
                  </div>

                  {/* Feedback */}
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <Link
                      to="/admin/feedback"
                      onClick={() => setActive("/admin/feedback")}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md transition-colors ${
                        location.pathname === "/admin/feedback"
                          ? "bg-sky-50 dark:bg-gray-800 text-sky-600 dark:text-sky-400"
                          : "text-gray-600 dark:text-gray-300 hover:text-sky-500 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-gray-800"
                      }`}
                    >
                      <GraduationCap className="w-3.5 h-3.5" />
                      <span className="font-medium text-xs">Feedback</span>
                      {location.pathname === "/admin/feedback" && (
                        <div className="ml-auto w-1.5 h-1.5 bg-sky-500 dark:bg-sky-400 rounded-full" />
                      )}
                    </Link>
                  </div>
                </div>

                {/* Mobile Menu Footer Actions */}
                <div className="mt-auto space-y-1.5 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <Link
                    to="/admin/activity"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-md text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-gray-800 transition-colors group"
                  >
                    <Activity className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span className="font-medium text-xs">Activity Log</span>
                  </Link>

                  <Link
                    to="/admin/change-password"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-md text-gray-700 dark:text-gray-200 hover:bg-sky-50 dark:hover:bg-gray-800 transition-colors group"
                  >
                    <Lock className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                    <span className="font-medium text-xs">Change Password</span>
                  </Link>
                  
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="font-medium text-xs">Logout</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}