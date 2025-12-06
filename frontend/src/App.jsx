import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import StudentLogin from "./auth/StudentLogin";
import ResetPassword from "./auth/ResetPassword";
import LandingPage from "./pages/LandingPage";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsAndConditions from "./pages/TermsAndConditions";
import ContactUs from "./pages/ContactUs";
import StudentDashboard from "./student/StudentDashboard";
import ChangePassword from "./student/ChangePassword";
import SessionAndFeedback from "./student/SessionAndFeedback";
import FeedbackForm from "./student/FeedbackForm";
import StudentProtectedRoute from "./student/StudentProtectedRoute";
import AdminDashboard from "./admin/AdminDashboard";
import StudentOnboarding from "./admin/StudentOnboarding";
import StudentDirectory from "./admin/StudentDirectory";
import EventManagement from "./admin/EventManagement";
import EventDetail from "./admin/EventDetail";
import FeedbackReview from "./admin/FeedbackReview";
import CoordinatorOnboarding from "./admin/CoordinatorOnboarding";
import AdminChangePassword from "./admin/AdminChangePassword";
import AdminProtectedRoute from "./admin/AdminProtectedRoute";
import CoordinatorDashboard from "./coordinator/CoordinatorDashboard";
import CoordinatorStudents from "./coordinator/CoordinatorStudents";
import CoordinatorChangePassword from "./coordinator/CoordinatorChangePassword";
import CoordinatorEventDetail from "./coordinator/CoordinatorEventDetail";
import CoordinatorProtectedRoute from "./coordinator/CoordinatorProtectedRoute";
import { StudentNavbar, AdminNavbar, Footer } from "./components/Layout";
import { CoordinatorNavbar } from "./coordinator/CoordinatorNavbar";
import { ToastContainer } from 'react-toastify';

const gradientBg = "bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100";

function AppContent() {
  const location = useLocation();
  const isMain = location.pathname === "/";
  const isStudentLogin = location.pathname === "/student";
  const isResetPassword = location.pathname === "/reset-password";
  const isPublicPage = location.pathname === "/privacy" || location.pathname === "/terms" || location.pathname === "/contact";
  const isFeedbackForm = location.pathname.startsWith("/student/feedback/");
  const isChangePassword = location.pathname === "/student/change-password" || location.pathname === "/admin/change-password" || location.pathname === "/coordinator/change-password";
  const isStudentDashboard = location.pathname.startsWith("/student/") && !isStudentLogin && !isFeedbackForm && !isChangePassword;
  const isAdmin = location.pathname.startsWith("/admin/");
  const isCoordinator = location.pathname.startsWith("/coordinator/");
  const isLoginPage = isMain || isStudentLogin || isResetPassword;

  return (
    <div className={gradientBg + " min-h-screen w-full flex flex-col"}>
      {!isFeedbackForm && !isPublicPage && (
        isAdmin ? <AdminNavbar /> :
        isCoordinator ? <CoordinatorNavbar /> :
        isStudentDashboard ? <StudentNavbar /> :
        null
      )}
     
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/student" element={<StudentLogin />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsAndConditions />} />
        <Route path="/contact" element={<ContactUs />} />
        
        {/* Student Routes - Protected */}
        <Route path="/student/change-password" element={<StudentProtectedRoute><ChangePassword /></StudentProtectedRoute>} />
        <Route path="/student/dashboard" element={<StudentProtectedRoute><StudentDashboard /></StudentProtectedRoute>} />
        <Route path="/student/session" element={<StudentProtectedRoute><SessionAndFeedback /></StudentProtectedRoute>} />
        <Route path="/student/feedback/:pairId" element={<StudentProtectedRoute><FeedbackForm /></StudentProtectedRoute>} />
        
        {/* Admin Routes - Protected */}
        <Route path="/admin/dashboard" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
        <Route path="/admin/onboarding" element={<AdminProtectedRoute><StudentOnboarding /></AdminProtectedRoute>} />
        <Route path="/admin/students" element={<AdminProtectedRoute><StudentDirectory /></AdminProtectedRoute>} />
        <Route path="/admin/coordinators" element={<AdminProtectedRoute><CoordinatorOnboarding /></AdminProtectedRoute>} />
        <Route path="/admin/event" element={<AdminProtectedRoute><EventManagement /></AdminProtectedRoute>} />
        <Route path="/admin/event/:id" element={<AdminProtectedRoute><EventDetail /></AdminProtectedRoute>} />
        <Route path="/admin/feedback" element={<AdminProtectedRoute><FeedbackReview /></AdminProtectedRoute>} />
        <Route path="/admin/change-password" element={<AdminProtectedRoute><AdminChangePassword /></AdminProtectedRoute>} />
        
        {/* Coordinator Routes - Protected */}
        <Route path="/coordinator/dashboard" element={<CoordinatorProtectedRoute><CoordinatorDashboard /></CoordinatorProtectedRoute>} />
        <Route path="/coordinator" element={<CoordinatorProtectedRoute><CoordinatorDashboard /></CoordinatorProtectedRoute>} />
        <Route path="/coordinator/students" element={<CoordinatorProtectedRoute><CoordinatorStudents /></CoordinatorProtectedRoute>} />
        <Route path="/coordinator/event/create" element={<CoordinatorProtectedRoute><EventManagement /></CoordinatorProtectedRoute>} />
        <Route path="/coordinator/event/:id" element={<CoordinatorProtectedRoute><CoordinatorEventDetail /></CoordinatorProtectedRoute>} />
        <Route path="/coordinator/change-password" element={<CoordinatorProtectedRoute><CoordinatorChangePassword /></CoordinatorProtectedRoute>} />
      </Routes>
      
      {!isLoginPage && !isFeedbackForm && !isPublicPage && <Footer />}
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