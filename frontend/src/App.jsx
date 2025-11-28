import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import StudentLogin from "./auth/StudentLogin";
import ResetPassword from "./auth/ResetPassword";
import LandingPage from "./pages/LandingPage";
import StudentDashboard from "./student/StudentDashboard";
import ChangePassword from "./student/ChangePassword";
import SessionAndFeedback from "./student/SessionAndFeedback";
import FeedbackForm from "./student/FeedbackForm";
import StudentOnboarding from "./admin/StudentOnboarding";
import StudentDirectory from "./admin/StudentDirectory";
import EventManagement from "./admin/EventManagement";
import EventDetail from "./admin/EventDetail";
import FeedbackReview from "./admin/FeedbackReview";
import AdminChangePassword from "./admin/AdminChangePassword";
import AdminProtectedRoute from "./admin/AdminProtectedRoute";
import { StudentNavbar, AdminNavbar, Footer } from "./components/Layout";
import { ToastContainer } from 'react-toastify';

const gradientBg = "bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100";

function AppContent() {
  const location = useLocation();
  const isMain = location.pathname === "/";
  const isStudentLogin = location.pathname === "/student";
  const isResetPassword = location.pathname === "/reset-password";
  const isFeedbackForm = location.pathname.startsWith("/student/feedback/");
  const isChangePassword = location.pathname === "/student/change-password" || location.pathname === "/admin/change-password";
  const isStudentDashboard = location.pathname.startsWith("/student/") && !isStudentLogin && !isFeedbackForm && !isChangePassword;
  const isAdmin = location.pathname.startsWith("/admin/");
  const isLoginPage = isMain || isStudentLogin || isResetPassword;

  return (
    <div className={gradientBg + " min-h-screen w-full flex flex-col"}>
      {!isFeedbackForm && (isAdmin ? <AdminNavbar /> : isStudentDashboard ? <StudentNavbar /> : null)}
     
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/student" element={<StudentLogin />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/student/change-password" element={<ChangePassword />} />
          <Route path="/student/dashboard" element={<StudentDashboard />} />
          <Route path="/student/session" element={<SessionAndFeedback />} />
          <Route path="/student/feedback/:pairId" element={<FeedbackForm />} />
          <Route path="/admin/onboarding" element={<StudentOnboarding />} />
          <Route path="/admin/students" element={<StudentDirectory />} />
          <Route path="/admin/event" element={<EventManagement />} />
          <Route path="/admin/event/:id" element={<EventDetail />} />
          <Route path="/admin/feedback" element={<FeedbackReview />} />
          <Route path="/admin/change-password" element={<AdminChangePassword />} />
        </Routes>
      
      {!isLoginPage && !isFeedbackForm && <Footer />}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
      <ToastContainer position="top-right" autoClose={3000} />
    </BrowserRouter>
  );
}

export default App;