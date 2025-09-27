
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Menu, X, Users, CalendarDays, GraduationCap, BookOpen } from "lucide-react";
import { useState, useEffect } from "react";

export function AdminNavbar() {
  const location = useLocation();
  const [active, setActive] = useState(location.pathname);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem("isAdmin");
    window.location.href = "/student";
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

  const menuVariants = {
    closed: { x: "100%", opacity: 0, transition: { duration: 0.3, ease: "easeInOut" } },
    open: { x: 0, opacity: 1, transition: { duration: 0.3, ease: "easeInOut" } }
  };

  const itemHover = {
    hover: { y: -2, scale: 1.02, transition: { duration: 0.2, ease: "easeOut" } },
    tap: { scale: 0.98 }
  };

  return (
    <motion.nav
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-blue-100/30"
      style={{
        background: "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 100%)",
        backdropFilter: "blur(12px) saturate(180%)",
        boxShadow: "0 4px 20px rgba(14,42,80,0.08)"
      }}
    >
      <div className="max-w-full mx-auto flex items-center justify-between h-16 px-4 sm:px-6">
        <motion.div 
          className="flex items-center gap-3"
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <GraduationCap className="text-white w-5 h-5" />
            </div>
            <h1 className="text-slate-800 text-xl font-bold tracking-tight hidden sm:block">
              Admin Dashboard
            </h1>
          </div>
        </motion.div>

        <div className="flex-1 flex justify-center sm:hidden">
          <h1 className="text-slate-800 text-lg font-bold tracking-tight flex items-center gap-2">
            <GraduationCap className="text-purple-600 w-4 h-4" />
            Admin
          </h1>
        </div>

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
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl transition-all duration-200 mx-1 ${
                    isActive 
                      ? "bg-purple-50 text-purple-700 shadow-sm" 
                      : "text-slate-600 hover:text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  {Icon ? <Icon className="w-4 h-4" /> : null}
                  <span className="font-medium text-sm">{label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute inset-0 border-2 border-purple-200 rounded-2xl"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </motion.div>
              </Link>
            );
          })}

          <motion.button
            variants={itemHover}
            whileHover="hover"
            whileTap="tap"
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-slate-600 hover:text-rose-600 hover:bg-rose-50 ml-2 transition-all duration-200"
          >
            <LogOut className="w-4 h-4" />
            <span className="font-medium text-sm">Logout</span>
          </motion.button>
        </div>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={toggleMenu}
          className="md:hidden flex items-center justify-center w-10 h-10 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors duration-200"
        >
          {isMenuOpen ? (
            <X className="text-slate-700 w-5 h-5" />
          ) : (
            <Menu className="text-slate-700 w-5 h-5" />
          )}
        </motion.button>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={toggleMenu}
              className="md:hidden fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            />
            <motion.div
              variants={menuVariants}
              initial="closed"
              animate="open"
              exit="closed"
              className="md:hidden fixed top-16 right-0 bottom-0 z-50 w-80 max-w-full"
            >
              <div className="bg-white h-full rounded-l-2xl shadow-2xl shadow-black/10 border-l border-slate-100 p-6 flex flex-col">
                <div className="flex items-center gap-3 pb-6 mb-4 border-b border-slate-100">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <GraduationCap className="text-white w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-slate-800 font-bold">Admin Dashboard</h2>
                    <p className="text-slate-500 text-sm">Manage system</p>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  {navItems.map(({ path, label, Icon }) => {
                    const isActive = active === path || location.pathname === path || location.pathname.startsWith(path.replace(":id", ""));
                    return (
                      <Link
                        key={path}
                        to={path}
                        onClick={() => setActive(path)}
                        className={`block rounded-2xl p-3 transition-all duration-200 ${
                          isActive
                            ? "bg-purple-50 text-purple-700 border border-purple-100"
                            : "text-slate-600 hover:text-slate-800 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {Icon ? <Icon className="w-5 h-5" /> : null}
                          <span className="font-medium">{label}</span>
                          {isActive && (
                            <div className="ml-auto w-2 h-2 bg-purple-500 rounded-full" />
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
                <button
                  onClick={handleLogout}
                  className="mt-auto flex items-center gap-3 p-3 rounded-2xl text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-all duration-200 border border-transparent hover:border-rose-100"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Logout</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
