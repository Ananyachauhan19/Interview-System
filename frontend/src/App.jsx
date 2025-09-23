import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import StudentLogin from "./auth/StudentLogin";
import AdminLogin from "./auth/AdminLogin";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
        <h1 className="text-3xl font-bold mb-6">Login Portal</h1>

        <div className="flex space-x-4 mb-8">
          <Link
            to="/student"
            className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 transition"
          >
            Student Login
          </Link>
          <Link
            to="/admin"
            className="px-4 py-2 bg-red-500 text-white rounded-lg shadow hover:bg-red-600 transition"
          >
            Admin Login
          </Link>
        </div>

        {/* Routes */}
        <Routes>
          <Route path="/student" element={<StudentLogin />} />
          <Route path="/admin" element={<AdminLogin />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
