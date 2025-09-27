import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BookOpenCheck,
  Users2,
  CalendarDays,
  LogOut,
  Menu,
  X
} from "lucide-react";
import { useState } from "react";

export function StudentNavbar() {
  const location = useLocation();
  const [active, setActive] = useState(location.pathname);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("isStudent");
    window.location.href = "/student";
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const navItems = [
    { path: "/student/dashboard", label: "Dashboard", Icon: BookOpenCheck },
    { path: "/student/pairing", label: "Pairing", Icon: Users2 },
    { path: "/student/session", label: "Sessions", Icon: CalendarDays },
  ];

  // Animation variants for mobile menu
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

  return (
    <motion.nav
      initial={{ y: -30 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.36, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        background: "linear-gradient(90deg, rgba(252,250,244,0.96) 0%, rgba(235,245,255,0.96) 100%)",
        backdropFilter: "saturate(120%) blur(6px)",
        boxShadow: "0 10px 30px rgba(14,42,80,0.06), inset 0 -1px 0 rgba(14,42,80,0.03)"
      }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-4">
        {/* Left: Empty for mobile to allow centered text */}
        <div className="md:flex items-center gap-4 hidden">
          <div
            className="w-16 h-16 rounded-3xl flex items-center justify-center shadow-lg"
            style={{
              background: "linear-gradient(135deg, rgba(56,189,248,1) 0%, rgba(59,130,246,1) 100%)",
              boxShadow: "0 8px 20px rgba(59,130,246,0.16)"
            }}
          >
            <span className="text-white text-3xl font-semibold font-mono">S</span>
          </div>
        </div>

        {/* Center: Student Dashboard Text for Mobile */}
        <div className="flex-1 flex justify-center items-center">
          <h1 className="text-sky-900 text-lg md:text-3xl font-extrabold tracking-tight">
            Student Dashboard
          </h1>
        </div>

        {/* Right: Desktop Nav + Mobile Menu Toggle */}
        <div className="flex items-center">
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            {navItems.map(({ path, label, Icon }) => {
              const isActive = active === path || location.pathname === path;
              return (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setActive(path)}
                  title={label}
                  aria-label={label}
                  aria-current={isActive ? "page" : undefined}
                  className={`group flex items-center gap-3 px-5 py-3 rounded-2xl transition-all duration-300
                    ${isActive ? "bg-sky-100/95 shadow-[0_6px_18px_rgba(14,42,80,0.06)]" : "hover:bg-sky-50/60"}
                  `}
                >
                  <motion.div
                    whileHover={{ y: -3, scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.18 }}
                    className="flex items-center gap-3"
                  >
                    <Icon
                      size={22}
                      className={`${isActive ? "text-sky-700" : "text-sky-600/90 group-hover:text-sky-700"}`}
                    />
                    <span className={`text-base md:text-lg font-semibold ${isActive ? "text-slate-900" : "text-slate-700 group-hover:text-slate-900"}`}>
                      {label}
                    </span>
                  </motion.div>
                </Link>
              );
            })}

            {/* Desktop Logout Button */}
            <button
              onClick={handleLogout}
              title="Logout"
              aria-label="Logout"
              className="group relative flex items-center justify-center w-14 h-14 rounded-2xl transition-all duration-200 hover:bg-rose-50/70"
            >
              <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.98 }} className="flex items-center justify-center w-full h-full">
                <LogOut size={22} className="text-rose-600 group-hover:text-rose-700" />
              </motion.div>
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={toggleMenu}
            aria-label="Toggle Menu"
            className="md:hidden flex items-center justify-center w-12 h-12 rounded-xl hover:bg-sky-50/70 transition-all duration-200"
          >
            {isMenuOpen ? (
              <X size={26} className="text-sky-700" />
            ) : (
              <Menu size={26} className="text-sky-700" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <motion.div
        initial="closed"
        animate={isMenuOpen ? "open" : "closed"}
        variants={menuVariants}
        className="md:hidden fixed top-16 left-0 right-0 z-40"
      >
        {/* White Background Div Containing All Options */}
        <div className="bg-white w-10/12 max-w-xs ml-auto rounded-l-2xl shadow-[0_10px_30px_rgba(14,42,80,0.1)] p-5 flex flex-col gap-3">
          {navItems.map(({ path, label, Icon }) => {
            const isActive = active === path || location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                onClick={() => {
                  setActive(path);
                  setIsMenuOpen(false); // Close menu on click
                }}
                title={label}
                aria-label={label}
                aria-current={isActive ? "page" : undefined}
                className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300
                  ${isActive ? "bg-sky-100 shadow-[0_4px_12px_rgba(14,42,80,0.06)]" : "hover:bg-sky-50"}
                `}
              >
                <motion.div
                  whileHover={{ y: -2, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.18 }}
                  className="flex items-center gap-3"
                >
                  <Icon
                    size={22}
                    className={`${isActive ? "text-sky-700" : "text-sky-600/90 group-hover:text-sky-700"}`}
                  />
                  <span className={`text-base font-semibold ${isActive ? "text-slate-900" : "text-slate-700 group-hover:text-slate-900"}`}>
                    {label}
                  </span>
                </motion.div>
              </Link>
            );
          })}

          {/* Mobile Logout Button */}
          <button
            onClick={() => {
              handleLogout();
              setIsMenuOpen(false); // Close menu on logout
            }}
            title="Logout"
            aria-label="Logout"
            className="group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 hover:bg-rose-50"
          >
            <motion.div
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="flex items-center gap-3"
            >
              <LogOut size={22} className="text-rose-600 group-hover:text-rose-700" />
              <span className="text-base font-semibold text-slate-700 group-hover:text-slate-900">
                Logout
              </span>
            </motion.div>
          </button>
        </div>
      </motion.div>
    </motion.nav>
  );
}
