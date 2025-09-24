import { Navigate, Outlet } from "react-router-dom";

// Simulate admin authentication (replace with real auth logic)
const isAdminAuthenticated = () => {
  return localStorage.getItem("isAdmin") === "true";
};

export default function AdminProtectedRoute() {
  return isAdminAuthenticated() ? <Outlet /> : <Navigate to="/admin" replace />;
}
