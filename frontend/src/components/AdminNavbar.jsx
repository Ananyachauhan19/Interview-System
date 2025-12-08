/* eslint-disable no-unused-vars */
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Menu, X, Users, CalendarDays, GraduationCap, BookOpen, User, Lock, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "../utils/api";
import DarkModeToggle from "./DarkModeToggle";

export function AdminNavbar() {
  const location = useLocation();
  const [active, setActive] = useState(location.pathname);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [adminName, setAdminName] = useState(localStorage.getItem("adminName") || "Admin");
  const [adminEmail, setAdminEmail] = useState(localStorage.getItem("adminEmail") || "admin@example.com");

  // Fetch admin profile from backend
  useEffect(() => {
    async function fetchAdminProfile() {
      // Avoid hitting /auth/me without a token which causes 401 spam
      const existingToken = localStorage.getItem("token");
      if (!existingToken) return;
      try {
        const data = await api.me();
        if (data && data.email) {
          setAdminEmail(data.email);
          localStorage.setItem("adminEmail", data.email);
        }
        if (data && data.name) {
          setAdminName(data.name);
          localStorage.setItem("adminName", data.name);
        }
      } catch (err) {
        // Silently ignore 401s and keep local data
        console.warn("Admin profile fetch failed:", err?.message || err);
      }
    }
    fetchAdminProfile();
  }, []);

  // Close mobile menu and profile dropdown when route changes
  useEffect(() => {
    setIsMenuOpen(false);
    setIsProfileOpen(false);
  }, [location.pathname]);

  // Close profile dropdown on outside click (for desktop and mobile)
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
    localStorage.removeItem("isAdmin");
    localStorage.removeItem("adminName");
    localStorage.removeItem("adminEmail");
    window.location.href = "/";
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const navItems = [
    { path: "/admin/onboarding", label: "Add Students", Icon: Users },
    { path: "/admin/coordinators", label: "Add Coordinator", Icon: User },
    { path: "/admin/coordinator-directory", label: "Coordinator Database", Icon: Users },
    { path: "/admin/students", label: "Student Database", Icon: User },
    { path: "/admin/event", label: "Create Interview", Icon: CalendarDays },
    { path: "/admin/event/:id", label: "Scheduled Interviews", Icon: BookOpen },
    { path: "/admin/feedback", label: "Feedback Review", Icon: GraduationCap },
    { path: "/admin/learning", label: "Learning Modules", Icon: BookOpen },
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
      <div className="w-full flex items-center justify-between h-14 px-3 sm:px-4">
        {/* Brand Logo */}
        <motion.div
          className="hidden sm:flex items-center"
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <img 
            src="/images/logo.png" 
            alt="PeerPrep Logo" 
            className="w-auto object-contain"
            style={{ height: '90px' }}
          />
        </motion.div>

        {/* Center: Mobile Logo */}
        <div className="flex-1 flex justify-center sm:hidden">
          <img 
            src="/images/logo.png" 
            alt="PeerPrep Logo" 
            className="w-auto object-contain"
            style={{ height: '75px' }}
          />
        </div>

        {/* Right Side: Desktop Navigation + Mobile Buttons */}
        <div className="flex items-center gap-2">
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-0.5">
            {navItems.map(({ path, label, Icon }) => {
              const isActive = active === path || location.pathname === path || location.pathname.startsWith(path.replace(":id", ""));
              return (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setActive(path)}
                  className="relative"
                >
                  <motion.div
                    variants={itemHover}
                    whileHover="hover"
                    whileTap="tap"
                    className={`flex items-center gap-1 px-2 py-1.5 rounded-md transition-colors ${
                      isActive
                        ? "bg-sky-50 dark:bg-gray-800 text-sky-600 dark:text-sky-400"
                        : "text-gray-600 dark:text-gray-300 hover:text-sky-500 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="font-medium text-[11px]">{label}</span>
                    
                    {isActive && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="absolute inset-0 border-2 border-white/40 dark:border-gray-600/40 rounded-xl"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </motion.div>
                </Link>
              );
            })}

            {/* Dark Mode Toggle */}
            <DarkModeToggle className="ml-1" />

            {/* Desktop Profile Dropdown */}
            <div className="relative ml-1.5 profile-container">
              <motion.button
                variants={itemHover}
                whileHover="hover"
                whileTap="tap"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-gray-50 dark:bg-gray-800 hover:bg-sky-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-all duration-200 border border-gray-200 dark:border-gray-700"
              >
                <div className="w-7 h-7 rounded-full bg-sky-500 flex items-center justify-center text-white font-semibold text-xs">
                  {adminName.charAt(0).toUpperCase()}
                </div>
                <div className="text-left hidden lg:block">
                  <div className="font-semibold text-[11px] text-slate-800 dark:text-gray-200">{adminName}</div>
                  <div className="text-[9px] text-slate-500 dark:text-gray-400">Admin</div>
                </div>
                <ChevronDown className={`w-3 h-3 text-slate-500 dark:text-gray-400 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} />
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
                    <div className="bg-gradient-to-r from-sky-50 to-blue-50 dark:from-gray-700 dark:to-gray-700 px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center text-white font-bold text-xs">
                          {adminName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-xs text-slate-900 dark:text-gray-100 truncate">{adminName}</div>
                          <div className="text-[10px] text-slate-600 dark:text-gray-400 truncate">{adminEmail}</div>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-1.5">
                      <Link
                        to="/admin/change-password"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-gray-700 dark:text-gray-200 hover:bg-sky-50 dark:hover:bg-gray-700 transition-colors group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-sky-50 dark:bg-gray-700 flex items-center justify-center group-hover:bg-sky-100 dark:group-hover:bg-gray-600 transition-colors">
                          <Lock className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                        </div>
                        <div className="flex-1">
                          <div className="text-xs font-medium">Change Password</div>
                          <div className="text-[10px] text-slate-500 dark:text-gray-400">Update your account password</div>
                        </div>
                      </Link>

                      <button
                        onClick={() => {
                          setIsProfileOpen(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 dark:text-gray-200 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-red-50 dark:bg-gray-700 flex items-center justify-center group-hover:bg-red-100 dark:group-hover:bg-red-900/50 transition-colors">
                          <LogOut className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="text-xs font-medium text-red-600 dark:text-red-400">Logout</div>
                          <div className="text-[10px] text-slate-500 dark:text-gray-400">Sign out of your account</div>
                        </div>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Mobile Profile */}
          <div className="relative profile-container md:hidden">
            <motion.button
              variants={itemHover}
              whileHover="hover"
              whileTap="tap"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-sky-500 text-white font-semibold text-xs shadow-md"
            >
              {adminName.charAt(0).toUpperCase()}
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
                  <div className="bg-gradient-to-r from-sky-50 to-blue-50 dark:from-gray-700 dark:to-gray-700 px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center text-white font-bold text-xs">
                        {adminName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-xs text-slate-900 dark:text-gray-100 truncate">{adminName}</div>
                        <div className="text-[10px] text-slate-600 dark:text-gray-400 truncate">{adminEmail}</div>
                      </div>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="py-1.5">
                    <Link
                      to="/admin/change-password"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-gray-700 dark:text-gray-200 hover:bg-sky-50 dark:hover:bg-gray-700 transition-colors group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-sky-50 dark:bg-gray-700 flex items-center justify-center group-hover:bg-sky-100 dark:group-hover:bg-gray-600 transition-colors">
                        <Lock className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-medium">Change Password</div>
                        <div className="text-[10px] text-slate-500 dark:text-gray-400">Update your account password</div>
                      </div>
                    </Link>

                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 dark:text-gray-200 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-red-50 dark:bg-gray-700 flex items-center justify-center group-hover:bg-red-100 dark:group-hover:bg-red-900/50 transition-colors">
                        <LogOut className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-xs font-medium text-red-600 dark:text-red-400">Logout</div>
                        <div className="text-[10px] text-slate-500">Sign out of your account</div>
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
            className="md:hidden flex items-center justify-center w-8 h-8 rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200 border border-gray-200 dark:border-gray-700"
          >
            {isMenuOpen ? (
              <X className="text-gray-700 dark:text-gray-300 w-4 h-4" />
            ) : (
              <Menu className="text-gray-700 dark:text-gray-300 w-4 h-4" />
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
              className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            />
            
            {/* Menu Content */}
            <motion.div
              variants={menuVariants}
              initial="closed"
              animate="open"
              exit="closed"
              className="md:hidden fixed top-14 right-0 bottom-0 z-50 w-80 max-w-full"
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
                  {navItems.map(({ path, label, Icon }) => {
                    const isActive = active === path || location.pathname === path || location.pathname.startsWith(path.replace(":id", ""));
                    return (
                      <Link
                        key={path}
                        to={path}
                        onClick={() => setActive(path)}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md transition-colors ${
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

                {/* Mobile Menu Footer Actions */}
                <div className="mt-auto space-y-1.5 pt-3 border-t border-gray-200 dark:border-gray-700">
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