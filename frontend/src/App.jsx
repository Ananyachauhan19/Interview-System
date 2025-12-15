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
import StudentLearning from "./student/StudentLearning";
import LearningDetail from "./student/LearningDetail";
import StudentProfile from "./student/StudentProfile";
import HelpAndSupport from "./student/HelpAndSupport";
import StudentProtectedRoute from "./student/StudentProtectedRoute";
import AdminDashboard from "./admin/AdminDashboard";
import AdminLearning from "./admin/AdminLearning";
import AdminLearningDetail from "./admin/AdminLearningDetail";
import StudentOnboarding from "./admin/StudentOnboarding";
import StudentDirectory from "./admin/StudentDirectory";
import EventManagement from "./admin/EventManagement";
import EventDetail from "./admin/EventDetail";
import FeedbackReview from "./admin/FeedbackReview";
import CoordinatorOnboarding from "./admin/CoordinatorOnboarding";
import CoordinatorDirectory from "./admin/CoordinatorDirectory";
import AdminChangePassword from "./admin/AdminChangePassword";
import AdminActivity from "./admin/AdminActivity";
import AdminProtectedRoute from "./admin/AdminProtectedRoute";
import CoordinatorDashboard from "./coordinator/CoordinatorDashboard";
import CoordinatorStudents from "./coordinator/CoordinatorStudents";
import CoordinatorChangePassword from "./coordinator/CoordinatorChangePassword";
import CoordinatorEventDetail from "./coordinator/CoordinatorEventDetail";
import CoordinatorProfile from "./coordinator/CoordinatorProfile";
import SemesterManagement from "./coordinator/SemesterManagement";
import CoordinatorFeedback from "./coordinator/CoordinatorFeedback";
import CoordinatorActivity from "./coordinator/CoordinatorActivity";
import CoordinatorProtectedRoute from "./coordinator/CoordinatorProtectedRoute";
import { StudentNavbar, AdminNavbar, Footer } from "./components/Layout";
import { CoordinatorNavbar } from "./coordinator/CoordinatorNavbar";
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/CustomToast';

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
  const isCoordinator = location.pathname.startsWith("/coordinator");
  const isLoginPage = isMain || isStudentLogin || isResetPassword;

  return (
    <div className={gradientBg + " dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 min-h-screen w-full flex flex-col"}>
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
        <Route path="/student/profile" element={<StudentProtectedRoute><StudentProfile /></StudentProtectedRoute>} />
        <Route path="/student/dashboard" element={<StudentProtectedRoute><StudentDashboard /></StudentProtectedRoute>} />
        <Route path="/student/session" element={<StudentProtectedRoute><SessionAndFeedback /></StudentProtectedRoute>} />
        <Route path="/student/feedback/:pairId" element={<StudentProtectedRoute><FeedbackForm /></StudentProtectedRoute>} />
        <Route path="/student/learning" element={<StudentProtectedRoute><StudentLearning /></StudentProtectedRoute>} />
        <Route path="/student/learning/:semester/:subject/:teacherId" element={<StudentProtectedRoute><LearningDetail /></StudentProtectedRoute>} />
        <Route path="/student/help" element={<StudentProtectedRoute><HelpAndSupport /></StudentProtectedRoute>} />
        
        {/* Admin Routes - Protected */}
        <Route path="/admin/dashboard" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
        <Route path="/admin/onboarding" element={<AdminProtectedRoute><StudentOnboarding /></AdminProtectedRoute>} />
        <Route path="/admin/students" element={<AdminProtectedRoute><StudentDirectory /></AdminProtectedRoute>} />
        <Route path="/admin/coordinator-directory" element={<AdminProtectedRoute><CoordinatorDirectory /></AdminProtectedRoute>} />
        <Route path="/admin/coordinators" element={<AdminProtectedRoute><CoordinatorOnboarding /></AdminProtectedRoute>} />
        <Route path="/admin/event" element={<AdminProtectedRoute><EventManagement /></AdminProtectedRoute>} />
        <Route path="/admin/event/:id" element={<AdminProtectedRoute><EventDetail /></AdminProtectedRoute>} />
        <Route path="/admin/feedback" element={<AdminProtectedRoute><FeedbackReview /></AdminProtectedRoute>} />
        <Route path="/admin/change-password" element={<AdminProtectedRoute><AdminChangePassword /></AdminProtectedRoute>} />
        <Route path="/admin/learning" element={<AdminProtectedRoute><AdminLearning /></AdminProtectedRoute>} />
        <Route path="/admin/learning/:semester/:subject/:teacherId" element={<AdminProtectedRoute><AdminLearningDetail /></AdminProtectedRoute>} />
        <Route path="/admin/activity" element={<AdminProtectedRoute><AdminActivity /></AdminProtectedRoute>} />
        
        {/* Coordinator Routes - Protected */}
        <Route path="/coordinator" element={<CoordinatorProtectedRoute><CoordinatorEventDetail /></CoordinatorProtectedRoute>} />
        <Route path="/coordinator/event/:id" element={<CoordinatorProtectedRoute><CoordinatorEventDetail /></CoordinatorProtectedRoute>} />
        <Route path="/coordinator/students" element={<CoordinatorProtectedRoute><CoordinatorStudents /></CoordinatorProtectedRoute>} />
        <Route path="/coordinator/subjects" element={<CoordinatorProtectedRoute><SemesterManagement /></CoordinatorProtectedRoute>} />
        <Route path="/coordinator/feedback" element={<CoordinatorProtectedRoute><CoordinatorFeedback /></CoordinatorProtectedRoute>} />
        <Route path="/coordinator/event/create" element={<CoordinatorProtectedRoute><EventManagement /></CoordinatorProtectedRoute>} />
        <Route path="/coordinator/profile" element={<CoordinatorProtectedRoute><CoordinatorProfile /></CoordinatorProtectedRoute>} />
        <Route path="/coordinator/change-password" element={<CoordinatorProtectedRoute><CoordinatorChangePassword /></CoordinatorProtectedRoute>} />
        <Route path="/coordinator/activity" element={<CoordinatorProtectedRoute><CoordinatorActivity /></CoordinatorProtectedRoute>} />
      </Routes>
      
      {!isLoginPage && !isFeedbackForm && !isPublicPage && <Footer />}
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;