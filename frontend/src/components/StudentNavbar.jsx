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
  User,
  Lock,
  ChevronDown
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
    { path: "/student/learning", label: "Learning Modules", Icon: GraduationCap },
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
      className="fixed top-0 left-0 right-0 z-50 border-b border-gray-200 bg-white shadow-sm"
    >
      <div className="w-full flex items-center justify-between h-14 px-4">
        {/* Brand Logo */}
        <div className="hidden sm:flex items-center">
          <img 
            src="/images/logo.png" 
            alt="PeerPrep Logo" 
            className="w-auto object-contain"
            style={{ height: '109px' }}
          />
        </div>

        {/* Center: Mobile Logo */}
        <div className="flex-1 flex justify-center sm:hidden">
          <img 
            src="/images/logo.png" 
            alt="PeerPrep Logo" 
            className="w-auto object-contain"
            style={{ height: '87px' }}
          />
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
                        ? "bg-sky-50 text-sky-600" 
                        : "text-gray-600 hover:text-sky-500 hover:bg-sky-50"
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
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-50 hover:bg-sky-50 text-gray-700 transition-all duration-200 border border-gray-200"
              >
                <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center text-white font-semibold text-sm">
                  {studentName.charAt(0).toUpperCase()}
                </div>
                <div className="text-left hidden lg:block">
                  <div className="font-semibold text-sm text-slate-800">{studentName}</div>
                  <div className="text-xs text-slate-500">Student</div>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} />
              </button>

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
                          {studentName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-900 truncate">{studentName}</div>
                          <div className="text-xs text-slate-600 truncate">{studentEmail}</div>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                      <Link
                        to="/student/change-password"
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
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-sky-50 transition-colors group"
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
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-sky-500 text-white font-semibold text-sm shadow-md"
            >
              {studentName.charAt(0).toUpperCase()}
            </button>

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
                        {studentName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-900 truncate">{studentName}</div>
                        <div className="text-xs text-slate-600 truncate">{studentEmail}</div>
                      </div>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="py-2">
                    <Link
                      to="/student/change-password"
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
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-sky-50 transition-colors group"
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
          <button
            onClick={toggleMenu}
            className="md:hidden flex items-center justify-center w-8 h-8 rounded bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            {isMenuOpen ? (
              <X className="text-gray-700 w-4 h-4" />
            ) : (
              <Menu className="text-gray-700 w-4 h-4" />
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
                <div className="flex items-center pb-4 mb-3 border-b border-gray-200">
                  <img 
                    src="/images/logo.png" 
                    alt="PeerPrep Logo" 
                    className="w-auto object-contain"
                    style={{ height: '109px' }}
                  />
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
                            ? "bg-sky-50 text-sky-600"
                            : "text-gray-600 hover:text-sky-500 hover:bg-sky-50"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="font-medium text-sm">{label}</span>
                        {isActive && (
                          <div className="ml-auto w-1.5 h-1.5 bg-sky-500 rounded-full" />
                        )}
                      </Link>
                    );
                  })}
                </div>

                {/* Mobile Menu Footer Actions */}
                <div className="space-y-2 pt-4 border-t border-gray-200">
                  <Link
                    to="/student/change-password"
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