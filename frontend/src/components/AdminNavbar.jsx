/* eslint-disable no-unused-vars */
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Menu, X, Users, CalendarDays, GraduationCap, BookOpen, User, Lock, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "../utils/api";

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
        console.error("Failed to fetch admin profile:", err);
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
    { path: "/admin/students", label: "Student Database", Icon: User },
    { path: "/admin/event", label: "Create Interview", Icon: CalendarDays },
    { path: "/admin/event/:id", label: "Scheduled Interviews", Icon: BookOpen },
    { path: "/admin/feedback", label: "Feedback Review", Icon: GraduationCap },
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
      className="fixed top-0 left-0 right-0 z-50 border-b border-gray-200 bg-white shadow-sm"
    >
      <div className="w-full flex items-center justify-between h-16 px-4 sm:px-6">
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
            style={{ height: '120px' }}
          />
        </motion.div>

        {/* Center: Mobile Logo */}
        <div className="flex-1 flex justify-center sm:hidden">
          <img 
            src="/images/logo.png" 
            alt="PeerPrep Logo" 
            className="w-auto object-contain"
            style={{ height: '99px' }}
          />
        </div>

        {/* Right Side: Desktop Navigation + Mobile Buttons */}
        <div className="flex items-center gap-2">
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
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
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors mx-1 ${
                      isActive
                        ? "bg-sky-50 text-sky-600"
                        : "text-gray-600 hover:text-sky-500 hover:bg-sky-50"
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

            {/* Desktop Profile Dropdown */}
            <div className="relative ml-3 profile-container">
              <motion.button
                variants={itemHover}
                whileHover="hover"
                whileTap="tap"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-50 hover:bg-sky-50 text-gray-700 transition-all duration-200 border border-gray-200"
              >
                <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center text-white font-semibold text-sm">
                  {adminName.charAt(0).toUpperCase()}
                </div>
                <div className="text-left hidden lg:block">
                  <div className="font-semibold text-sm text-slate-800">{adminName}</div>
                  <div className="text-xs text-slate-500">Admin</div>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} />
              </motion.button>

              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div
                    variants={dropdownVariants}
                    initial="closed"
                    animate="open"
                    exit="closed"
                    className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50"
                  >
                    {/* Profile Header */}
                    <div className="bg-gradient-to-r from-sky-50 to-blue-50 px-4 py-3 border-b border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-sky-500 flex items-center justify-center text-white font-bold">
                          {adminName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-900 truncate">{adminName}</div>
                          <div className="text-xs text-slate-600 truncate">{adminEmail}</div>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                      <Link
                        to="/admin/change-password"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-sky-50 transition-colors group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center group-hover:bg-sky-100 transition-colors">
                          <Lock className="w-4 h-4 text-sky-600" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">Change Password</div>
                          <div className="text-xs text-slate-500">Update your account password</div>
                        </div>
                      </Link>

                      <button
                        onClick={() => {
                          setIsProfileOpen(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-700 hover:bg-red-50 transition-colors group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center group-hover:bg-red-100 transition-colors">
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

          {/* Mobile Profile */}
          <div className="relative profile-container md:hidden">
            <motion.button
              variants={itemHover}
              whileHover="hover"
              whileTap="tap"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-sky-500 text-white font-semibold text-sm shadow-md"
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
                  className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50"
                >
                  {/* Profile Header */}
                  <div className="bg-gradient-to-r from-sky-50 to-blue-50 px-4 py-3 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-sky-500 flex items-center justify-center text-white font-bold">
                        {adminName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-900 truncate">{adminName}</div>
                        <div className="text-xs text-slate-600 truncate">{adminEmail}</div>
                      </div>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="py-2">
                    <Link
                      to="/admin/change-password"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-sky-50 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center group-hover:bg-sky-100 transition-colors">
                        <Lock className="w-4 h-4 text-sky-600" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">Change Password</div>
                        <div className="text-xs text-slate-500">Update your account password</div>
                      </div>
                    </Link>

                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-700 hover:bg-red-50 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center group-hover:bg-red-100 transition-colors">
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

          {/* Mobile Menu Toggle */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={toggleMenu}
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors duration-200 border border-gray-200"
          >
            {isMenuOpen ? (
              <X className="text-gray-700 w-5 h-5" />
            ) : (
              <Menu className="text-gray-700 w-5 h-5" />
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
              className="md:hidden fixed top-16 right-0 bottom-0 z-50 w-80 max-w-full"
            >
              <div className="bg-white h-full rounded-l-2xl shadow-2xl border-l border-slate-200 p-6 flex flex-col">
                {/* Mobile Menu Header */}
                <div className="flex items-center pb-6 mb-4 border-b border-gray-200">
                  <img 
                    src="/images/logo.png" 
                    alt="PeerPrep Logo" 
                    className="w-auto object-contain"
                    style={{ height: '120px' }}
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
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                          isActive
                            ? "bg-sky-50 text-sky-600"
                            : "text-gray-600 hover:text-sky-500 hover:bg-sky-50"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="font-medium text-sm">{label}</span>
                        {isActive && (
                          <div className="ml-auto w-2 h-2 bg-sky-500 rounded-full" />
                        )}
                      </Link>
                    );
                  })}
                </div>

                {/* Mobile Menu Footer Actions */}
                <div className="mt-auto space-y-2 pt-4 border-t border-gray-200">
                  <Link
                    to="/admin/change-password"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-700 hover:bg-sky-50 transition-colors group"
                  >
                    <Lock className="w-4 h-4 text-sky-600" />
                    <span className="font-medium text-sm">Change Password</span>
                  </Link>
                  
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="font-medium text-sm">Logout</span>
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