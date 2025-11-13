/* eslint-disable no-unused-vars */
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpenCheck,
  Users2,
  CalendarDays,
  LogOut,
  Menu,
  X,
  GraduationCap,
  User
} from "lucide-react";
import { useState, useEffect } from "react";

export function StudentNavbar() {
  const location = useLocation();
  const [active, setActive] = useState(location.pathname);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Retrieve student info from localStorage (set this in your login component)
  const studentName = localStorage.getItem("studentName") || "Student";
  const studentEmail = localStorage.getItem("studentEmail") || "email@example.com";

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
    setIsProfileOpen(false);
  }, [location.pathname]);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isProfileOpen && !event.target.closest(".profile-container")) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isProfileOpen]);

  const navigate = useNavigate();
  const handleLogout = () => {
    localStorage.removeItem("isStudent");
    localStorage.removeItem("studentName");
    localStorage.removeItem("studentEmail");
    navigate("/");
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const navItems = [
    { path: "/student/dashboard", label: "Dashboard", Icon: BookOpenCheck },
    { path: "/student/session", label: "Feedback", Icon: CalendarDays },
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
      <div className="w-full flex items-center justify-between h-14 px-4">
        {/* Brand Logo and Title (PeerPrep) */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
            <GraduationCap className="text-indigo-600 w-4 h-4" />
          </div>
          <div className="hidden sm:block">
            <div>
              <h1 className="text-slate-800 text-lg font-bold">PeerPrep</h1>
              <p className="text-xs text-indigo-600 -mt-1">Interview Practice Platform</p>
            </div>
          </div>
        </div>

        {/* Center: Mobile Title */}
        <div className="flex-1 flex justify-center sm:hidden">
          <h1 className="text-slate-800 font-semibold flex items-center gap-1 text-sm">
            <GraduationCap className="text-indigo-600 w-3 h-3" />
            Student
          </h1>
        </div>

        {/* Right Side: Desktop Navigation + Mobile Buttons */}
        <div className="flex items-center gap-1">
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-0">
            {navItems.map(({ path, label, Icon }) => {
              const isActive = active === path || location.pathname === path;
              return (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setActive(path)}
                  className="relative"
                >
                  <div
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors mx-0.5 ${
                      isActive 
                        ? "bg-indigo-50 text-indigo-700" 
                        : "text-slate-600 hover:text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span className="font-medium text-sm">{label}</span>
                  </div>
                </Link>
              );
            })}

            {/* Desktop Profile */}
            <div className="relative profile-container ml-1">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-slate-600 hover:text-slate-800 hover:bg-slate-50 transition-colors"
              >
                <User className="w-3 h-3" />
                <span className="font-medium text-sm">Profile</span>
              </button>

              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div
                    variants={dropdownVariants}
                    initial="closed"
                    animate="open"
                    exit="closed"
                    className="absolute top-full right-0 mt-1 w-56 bg-white rounded-lg shadow-lg p-3 border border-slate-200 z-50"
                  >
                    <h3 className="font-semibold text-slate-800 text-sm mb-2">Profile Info</h3>
                    <div className="text-slate-600 text-xs space-y-1">
                      <p className="font-medium">{studentName}</p>
                      <p className="text-slate-500">{studentEmail}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full mt-3 flex items-center gap-1.5 px-2 py-1.5 rounded text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors text-xs font-medium"
                    >
                      <LogOut className="w-3 h-3" />
                      <span>Logout</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Mobile Profile */}
          <div className="relative profile-container md:hidden">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center justify-center w-8 h-8 rounded bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <User className="text-slate-700 w-4 h-4" />
            </button>

            <AnimatePresence>
              {isProfileOpen && (
                <motion.div
                  variants={dropdownVariants}
                  initial="closed"
                  animate="open"
                  exit="closed"
                  className="absolute top-full right-0 mt-1 w-56 bg-white rounded-lg shadow-lg p-3 border border-slate-200 z-50"
                >
                  <h3 className="font-semibold text-slate-800 text-sm mb-2">Profile Info</h3>
                  <div className="text-slate-600 text-xs space-y-1">
                    <p className="font-medium">{studentName}</p>
                    <p className="text-slate-500">{studentEmail}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={toggleMenu}
            className="md:hidden flex items-center justify-center w-8 h-8 rounded bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            {isMenuOpen ? (
              <X className="text-slate-700 w-4 h-4" />
            ) : (
              <Menu className="text-slate-700 w-4 h-4" />
            )}
          </button>
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
              className="md:hidden fixed inset-0 z-40 bg-black/20"
            />
            
            {/* Menu Content */}
            <motion.div
              variants={menuVariants}
              initial="closed"
              animate="open"
              exit="closed"
              className="md:hidden fixed top-14 right-0 bottom-0 z-50 w-64 max-w-full"
            >
              <div className="bg-white h-full rounded-l-lg border-l border-slate-200 p-4 flex flex-col">
                {/* Mobile Menu Header */}
                <div className="flex items-center gap-2 pb-4 mb-3 border-b border-slate-200">
                  <div className="w-10 h-10 rounded-lg bg-indigo-800 flex items-center justify-center">
                    <GraduationCap className="text-white w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-slate-800 font-semibold">Student Hub</h2>
                  </div>
                </div>

                {/* Mobile Menu Items */}
                <div className="flex-1 space-y-1">
                  {navItems.map(({ path, label, Icon }) => {
                    const isActive = active === path || location.pathname === path;
                    return (
                      <Link
                        key={path}
                        to={path}
                        onClick={() => setActive(path)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                          isActive
                            ? "bg-indigo-50 text-indigo-700"
                            : "text-slate-600 hover:text-slate-800 hover:bg-slate-50"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="font-medium text-sm">{label}</span>
                        {isActive && (
                          <div className="ml-auto w-1.5 h-1.5 bg-indigo-600 rounded-full" />
                        )}
                      </Link>
                    );
                  })}
                </div>

                {/* Mobile Logout Button */}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors text-sm font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}