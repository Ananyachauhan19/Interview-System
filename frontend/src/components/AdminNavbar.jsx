/* eslint-disable no-unused-vars */
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Menu, X, Users, CalendarDays, GraduationCap, BookOpen, User } from "lucide-react";
import { useState, useEffect } from "react";

export function AdminNavbar() {
  const location = useLocation();
  const [active, setActive] = useState(location.pathname);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Retrieve admin info from localStorage (set this in your login component)
  const adminName = localStorage.getItem("adminName") || "Admin";
  const adminEmail = localStorage.getItem("adminEmail") || "admin@example.com";

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
    { path: "/admin/onboarding", label: "Student Onboarding", Icon: Users },
    { path: "/admin/students", label: "Student Directory", Icon: User },
    { path: "/admin/event", label: "Event Management", Icon: CalendarDays },
    { path: "/admin/event/:id", label: "Event Details", Icon: BookOpen },
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
      className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200 bg-white shadow-sm"
    >
      <div className="w-full flex items-center justify-between h-16 px-4 sm:px-6">
        {/* Brand Logo and Title (PeerPrep) */}
        <motion.div
          className="flex items-center gap-3"
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
              <GraduationCap className="text-indigo-600 w-5 h-5" />
            </div>
            <div className="hidden sm:block">
              <div>
                <h1 className="text-xl font-bold text-slate-800">PeerPrep</h1>
                <p className="text-xs text-indigo-600 -mt-1">Interview Practice Platform</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Center: Mobile Title */}
        <div className="flex-1 flex justify-center sm:hidden">
          <h1 className="text-white text-lg font-bold tracking-tight flex items-center gap-2">
            <GraduationCap className="text-white w-4 h-4" />
            Admin
          </h1>
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
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-slate-700 hover:text-slate-800 hover:bg-slate-50"
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

            {/* Desktop Logout Button */}
            <motion.button
              variants={itemHover}
              whileHover="hover"
              whileTap="tap"
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-700 hover:text-red-600 hover:bg-red-50 ml-2 transition-colors duration-200 border border-transparent hover:border-red-200"
            >
              <LogOut className="w-4 h-4" />
              <span className="font-medium text-sm">Logout</span>
            </motion.button>

            {/* Desktop Profile */}
            <div className="relative ml-2 profile-container">
              <motion.button
                variants={itemHover}
                whileHover="hover"
                whileTap="tap"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-700 hover:text-slate-800 hover:bg-slate-50 transition-colors duration-200 border border-transparent hover:border-slate-200"
              >
                <User className="w-4 h-4" />
                <span className="font-medium text-sm">Profile</span>
              </motion.button>

              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div
                    variants={dropdownVariants}
                    initial="closed"
                    animate="open"
                    exit="closed"
                    className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-50"
                  >
                    <h3 className="font-bold text-slate-900 text-base mb-3">Profile Info</h3>
                    <div className="text-slate-700 text-sm space-y-1">
                      <p className="font-semibold">{adminName}</p>
                      <p className="text-slate-500">{adminEmail}</p>
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
              className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors duration-200 border border-transparent"
            >
              <User className="text-slate-700 w-5 h-5" />
            </motion.button>

            <AnimatePresence>
              {isProfileOpen && (
                <motion.div
                  variants={dropdownVariants}
                  initial="closed"
                  animate="open"
                  exit="closed"
                  className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-50"
                >
                  <h3 className="font-bold text-slate-900 text-base mb-3">Profile Info</h3>
                  <div className="text-slate-700 text-sm space-y-1">
                    <p className="font-semibold">{adminName}</p>
                    <p className="text-slate-500">{adminEmail}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile Menu Toggle */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={toggleMenu}
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg bg-white/20 hover:bg-white/30 transition-colors duration-200 border border-white/30"
          >
            {isMenuOpen ? (
              <X className="text-white w-5 h-5" />
            ) : (
              <Menu className="text-white w-5 h-5" />
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
                <div className="flex items-center gap-3 pb-6 mb-4 border-b border-slate-200">
                  <div className="w-12 h-12 rounded-xl bg-indigo-800 flex items-center justify-center">
                    <GraduationCap className="text-white w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-slate-900 font-bold text-lg">Admin Dashboard</h2>
                  </div>
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
                            ? "bg-indigo-50 text-indigo-800"
                            : "text-slate-700 hover:text-indigo-800 hover:bg-slate-50"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="font-medium text-sm">{label}</span>
                        {isActive && (
                          <div className="ml-auto w-2 h-2 bg-indigo-600 rounded-full" />
                        )}
                      </Link>
                    );
                  })}
                </div>

                {/* Mobile Logout Button */}
                <button
                  onClick={handleLogout}
                  className="mt-auto flex items-center gap-2 px-4 py-2.5 rounded-xl text-slate-700 hover:text-red-600 hover:bg-red-50 transition-all duration-200 border border-transparent hover:border-red-200"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="font-medium text-sm">Logout</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}