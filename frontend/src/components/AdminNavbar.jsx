import { Link, useLocation, useNavigate } from "react-router-dom";
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

  const navigate = useNavigate();
  const handleLogout = () => {
    localStorage.removeItem("isAdmin");
    localStorage.removeItem("adminName");
    localStorage.removeItem("adminEmail");
  navigate("/");
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const navItems = [
    { path: "/admin/onboarding", label: "Student Onboarding", Icon: Users },
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
      className="fixed top-0 left-0 right-0 z-50 border-b border-blue-100/30 bg-white shadow-md"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-4 sm:px-6">
        {/* Brand Logo and Title */}
        <motion.div 
          className="flex items-center gap-3"
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <GraduationCap className="text-white w-5 h-5" />
            </div>
            <h1 className="text-slate-800 text-xl font-bold tracking-tight hidden sm:block">
              Admin Dashboard
            </h1>
          </div>
        </motion.div>

        {/* Center: Mobile Title */}
        <div className="flex-1 flex justify-center sm:hidden">
          <h1 className="text-slate-800 text-lg font-bold tracking-tight flex items-center gap-2">
            <GraduationCap className="text-purple-600 w-4 h-4" />
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
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 mx-1 ${
                      isActive 
                        ? "bg-purple-50 text-purple-700 shadow-sm" 
                        : "text-slate-600 hover:text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-medium text-sm">{label}</span>
                    
                    {isActive && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="absolute inset-0 border-2 border-purple-200 rounded-xl"
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
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-slate-600 hover:text-rose-600 hover:bg-rose-50 ml-2 transition-all duration-200"
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
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200"
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
                    className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-xl p-4 border border-slate-100 z-50"
                  >
                    <h3 className="font-bold text-slate-800 text-base mb-3">Profile Info</h3>
                    <div className="text-slate-600 text-sm space-y-1">
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
              className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors duration-200"
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
                  className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-xl p-4 border border-slate-100 z-50"
                >
                  <h3 className="font-bold text-slate-800 text-base mb-3">Profile Info</h3>
                  <div className="text-slate-600 text-sm space-y-1">
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
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors duration-200"
          >
            {isMenuOpen ? (
              <X className="text-slate-700 w-5 h-5" />
            ) : (
              <Menu className="text-slate-700 w-5 h-5" />
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
              className="md:hidden fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            />
            
            {/* Menu Content */}
            <motion.div
              variants={menuVariants}
              initial="closed"
              animate="open"
              exit="closed"
              className="md:hidden fixed top-16 right-0 bottom-0 z-50 w-80 max-w-full"
            >
              <div className="bg-white h-full rounded-l-2xl shadow-2xl shadow-black/10 border-l border-slate-100 p-6 flex flex-col">
                {/* Mobile Menu Header */}
                <div className="flex items-center gap-3 pb-6 mb-4 border-b border-slate-100">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <GraduationCap className="text-white w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-slate-800 font-bold text-lg">Admin Dashboard</h2>
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
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 ${
                          isActive
                            ? "bg-purple-50 text-purple-700 border border-purple-100"
                            : "text-slate-600 hover:text-slate-800 hover:bg-slate-50"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="font-medium text-sm">{label}</span>
                        {isActive && (
                          <div className="ml-auto w-2 h-2 bg-purple-500 rounded-full" />
                        )}
                      </Link>
                    );
                  })}
                </div>

                {/* Mobile Logout Button */}
                <button
                  onClick={handleLogout}
                  className="mt-auto flex items-center gap-2 px-4 py-2.5 rounded-xl text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-all duration-200 border border-transparent hover:border-rose-100"
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