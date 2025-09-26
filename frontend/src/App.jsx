import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import StudentLogin from "./auth/StudentLogin";
import StudentDashboard from "./student/StudentDashboard";
import PairingAndScheduling from "./student/PairingAndScheduling";
import SessionAndFeedback from "./student/SessionAndFeedback";
import AdminLogin from "./auth/AdminLogin";
import StudentOnboarding from "./admin/StudentOnboarding";
import EventManagement from "./admin/EventManagement";
import EventDetail from "./admin/EventDetail";
import AdminProtectedRoute from "./admin/AdminProtectedRoute";
import { StudentNavbar, AdminNavbar, Footer } from "./components/Layout";

const gradientBg = "bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100";
const cardStyle =
  "bg-white rounded-2xl shadow-xl p-10 w-full max-w-lg flex flex-col items-center";
const titleStyle =
  "text-4xl font-extrabold text-gray-800 mb-6 tracking-tight text-center";
const subtitleStyle = "text-lg text-gray-500 mb-8 text-center";
const buttonStyle =
  "w-full px-6 py-3 font-semibold rounded-xl shadow-md transition-all duration-200 text-lg flex items-center justify-center";
const studentBtn =
  `${buttonStyle} bg-blue-600 hover:bg-blue-700 text-white border-2 border-blue-600 mb-4`;
const adminBtn =
  `${buttonStyle} bg-red-600 hover:bg-red-700 text-white border-2 border-red-600`;

function MainCard() {
  return (
    <div className={cardStyle}>
      <h1 className={titleStyle}>Interview Management System</h1>
      <p className={subtitleStyle}>Choose your role to log in</p>
      <div className="w-full flex flex-col gap-4 mb-4">
        <Link to="/student" className={studentBtn}>
          🎓 Student Login
        </Link>
        <Link to="/admin" className={adminBtn}>
          🛠️ Admin Login
        </Link>
      </div>
    </div>
  );
}

function AppContent() {
  const location = useLocation();
  const isMain = location.pathname === "/";
  const isStudent = location.pathname.startsWith("/student") && !isMain;
  const isAdmin = location.pathname.startsWith("/admin") && location.pathname !== "/admin";

  return (
    <div className={`min-h-screen flex flex-col ${gradientBg}`}> 
      {/* Navbar */}
      {isStudent && <StudentNavbar />}
      {isAdmin && <AdminNavbar />}
      <div className="flex-1 flex items-center justify-center p-6">
        {isMain ? (
          <MainCard />
        ) : (
          <div className="w-full max-w-lg">
            <Routes>
              <Route path="/student" element={<StudentLogin />} />
              <Route path="/admin" element={<AdminLogin />} />
              <Route element={<AdminProtectedRoute />}>
                <Route path="/admin/onboarding" element={<StudentOnboarding />} />
                <Route path="/admin/event" element={<EventManagement />} />
                <Route path="/admin/event/:id" element={<EventDetail />} />
              </Route>
              <Route path="/student/dashboard" element={<StudentDashboard />} />
              <Route path="/student/pairing" element={<PairingAndScheduling />} />
              <Route path="/student/session" element={<SessionAndFeedback />} />
            </Routes>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
