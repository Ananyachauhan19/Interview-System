import { Link, useLocation } from "react-router-dom";

export function StudentNavbar() {
  const location = useLocation();
  const handleLogout = () => {
    localStorage.removeItem("isStudent");
    window.location.href = "/student";
  };

  const navLink = (location, path) =>
    `font-semibold px-3 py-1 rounded transition ${
      location.pathname === path
        ? "bg-white text-blue-700 shadow"
        : "hover:bg-blue-600 hover:text-white"
    }`;

  return (
    <nav className="bg-blue-700 text-white px-6 py-3 flex justify-between items-center shadow-lg">
      <div className="font-bold text-xl">Student Portal</div>
      <div className="flex gap-6 items-center">
        <Link to="/student/dashboard" className={navLink(location, "/student/dashboard")}>
          Dashboard
        </Link>
        <Link to="/student/pairing" className={navLink(location, "/student/pairing")}>
          Pairing
        </Link>
        <Link to="/student/session" className={navLink(location, "/student/session")}>
          Sessions
        </Link>
        <button
          onClick={handleLogout}
          className="ml-4 px-3 py-1 rounded bg-white text-blue-700 font-semibold shadow hover:bg-blue-600 hover:text-white transition"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}