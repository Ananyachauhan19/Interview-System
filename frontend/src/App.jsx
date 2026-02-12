import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { lazy, Suspense } from "react";
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/CustomToast';
import SessionMonitor from './components/SessionMonitor';

// Lazy-load navbars to keep them out of the main bundle
const StudentNavbar = lazy(() => import('./components/StudentNavbar').then(m => ({ default: m.StudentNavbar })));
const AdminNavbar = lazy(() => import('./components/AdminNavbar').then(m => ({ default: m.AdminNavbar })));
const CoordinatorNavbar = lazy(() => import('./coordinator/CoordinatorNavbar').then(m => ({ default: m.CoordinatorNavbar })));
const Footer = lazy(() => import('./components/Footer').then(m => ({ default: m.Footer })));

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 dark:border-blue-400 mx-auto"></div>
      <p className="mt-4 text-slate-600 dark:text-gray-300 font-medium">Loading...</p>
    </div>
  </div>
);

// Lazy load all route components for code splitting
// Auth & Public Pages
const LandingPage = lazy(() => import("./pages/LandingPage"));
const StudentLogin = lazy(() => import("./auth/StudentLogin"));
const ResetPassword = lazy(() => import("./auth/ResetPassword"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsAndConditions = lazy(() => import("./pages/TermsAndConditions"));
const ContactUs = lazy(() => import("./pages/ContactUs"));

// Student Pages
const StudentProtectedRoute = lazy(() => import("./student/StudentProtectedRoute"));
const StudentDashboard = lazy(() => import("./student/StudentDashboard"));
const ChangePassword = lazy(() => import("./student/ChangePassword"));
const SessionAndFeedback = lazy(() => import("./student/SessionAndFeedback"));
const FeedbackForm = lazy(() => import("./student/FeedbackForm"));
const StudentLearning = lazy(() => import("./student/StudentLearning"));
const LearningDetail = lazy(() => import("./student/LearningDetail"));
const StudentProfile = lazy(() => import("./student/StudentProfile"));
const HelpAndSupport = lazy(() => import("./student/HelpAndSupport"));

// Admin Pages
const AdminProtectedRoute = lazy(() => import("./admin/AdminProtectedRoute"));
const AdminDashboard = lazy(() => import("./admin/AdminDashboard"));
const AdminLearning = lazy(() => import("./admin/AdminLearning"));
const AdminLearningDetail = lazy(() => import("./admin/AdminLearningDetail"));
const StudentOnboarding = lazy(() => import("./admin/StudentOnboarding"));
const StudentDirectory = lazy(() => import("./admin/StudentDirectory"));
const EventManagement = lazy(() => import("./admin/EventManagement"));
const EventDetail = lazy(() => import("./admin/EventDetail"));
const FeedbackReview = lazy(() => import("./admin/FeedbackReview"));
const CoordinatorOnboarding = lazy(() => import("./admin/CoordinatorOnboarding"));
const CoordinatorDirectory = lazy(() => import("./admin/CoordinatorDirectory"));
const AdminChangePassword = lazy(() => import("./admin/AdminChangePassword"));
const AdminActivity = lazy(() => import("./admin/AdminActivity"));

// Coordinator Pages
const CoordinatorProtectedRoute = lazy(() => import("./coordinator/CoordinatorProtectedRoute"));
const CoordinatorDashboard = lazy(() => import("./coordinator/CoordinatorDashboard"));
const CoordinatorStudents = lazy(() => import("./coordinator/CoordinatorStudents"));
const CoordinatorChangePassword = lazy(() => import("./coordinator/CoordinatorChangePassword"));
const CoordinatorEventDetail = lazy(() => import("./coordinator/CoordinatorEventDetail"));
const CoordinatorProfile = lazy(() => import("./coordinator/CoordinatorProfile"));
const SemesterManagement = lazy(() => import("./coordinator/SemesterManagement"));
const CoordinatorFeedback = lazy(() => import("./coordinator/CoordinatorFeedback"));
const CoordinatorActivity = lazy(() => import("./coordinator/CoordinatorActivity"));
const CoordinatorDatabase = lazy(() => import("./coordinator/CoordinatorDatabase"));

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
    <div className="min-h-screen w-full flex flex-col">
      <SessionMonitor />
      {!isFeedbackForm && !isPublicPage && (
        <Suspense fallback={null}>
          {isAdmin ? <AdminNavbar /> :
           isCoordinator ? <CoordinatorNavbar /> :
           isStudentDashboard ? <StudentNavbar /> :
           null}
        </Suspense>
      )}
     
      <main className={gradientBg + " dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex-grow"}>
        <Suspense fallback={<PageLoader />}>
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
        <Route path="/coordinator/database" element={<CoordinatorProtectedRoute><CoordinatorDatabase /></CoordinatorProtectedRoute>} />
        <Route path="/coordinator/feedback" element={<CoordinatorProtectedRoute><CoordinatorFeedback /></CoordinatorProtectedRoute>} />
        <Route path="/coordinator/event/create" element={<CoordinatorProtectedRoute><EventManagement /></CoordinatorProtectedRoute>} />
        <Route path="/coordinator/profile" element={<CoordinatorProtectedRoute><CoordinatorProfile /></CoordinatorProtectedRoute>} />
        <Route path="/coordinator/change-password" element={<CoordinatorProtectedRoute><CoordinatorChangePassword /></CoordinatorProtectedRoute>} />
        <Route path="/coordinator/activity" element={<CoordinatorProtectedRoute><CoordinatorActivity /></CoordinatorProtectedRoute>} />
          </Routes>
        </Suspense>
      </main>
      
      {!isLoginPage && !isFeedbackForm && !isPublicPage && (
        <Suspense fallback={null}><Footer /></Suspense>
      )}
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