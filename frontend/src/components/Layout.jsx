import { Link, useLocation } from "react-router-dom";

export function StudentNavbar() {
  const location = useLocation();
  return (
    <nav className="bg-blue-700 text-white px-6 py-3 flex justify-between items-center shadow-lg">
      <div className="font-bold text-xl">Student Portal</div>
      <div className="flex gap-6">
        <Link to="/student/dashboard" className={navLink(location, "/student/dashboard")}>Dashboard</Link>
        <Link to="/student/pairing" className={navLink(location, "/student/pairing")}>Pairing</Link>
        <Link to="/student/session" className={navLink(location, "/student/session")}>Sessions</Link>
      </div>
    </nav>
  );
}

export function AdminNavbar() {
  const location = useLocation();
  return (
    <nav className="bg-red-700 text-white px-6 py-3 flex justify-between items-center shadow-lg">
      <div className="font-bold text-xl">Admin Dashboard</div>
      <div className="flex gap-6">
        <Link to="/admin/onboarding" className={navLink(location, "/admin/onboarding")}>Student Onboarding</Link>
        <Link to="/admin/event" className={navLink(location, "/admin/event")}>Event Management</Link>
      </div>
    </nav>
  );
}

function navLink(location, path) {
  return (
    "font-semibold px-3 py-1 rounded transition " +
    (location.pathname === path ? "bg-white text-blue-700 shadow" : "hover:bg-blue-600 hover:text-white")
  );
}

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-200 py-4 text-center mt-auto w-full shadow-inner">
      <div className="text-sm">&copy; {new Date().getFullYear()} Interview Management System. All rights reserved.</div>
    </footer>
  );
}
