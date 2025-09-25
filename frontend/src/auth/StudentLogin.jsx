import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, setToken } from "../utils/api";

export default function StudentLogin() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [mustChange, setMustChange] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await api.studentLogin(identifier, password);
      setToken(res.token);
      localStorage.setItem("isAdmin", "false");
      if (res.user.mustChangePassword) setMustChange(true);
      else {
        alert("✅ Student login successful");
        navigate("/student/dashboard", { replace: true });
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError("");
    try {
  await api.changePassword(newPassword);
  setMustChange(false);
  alert("Password updated. Please login again.");
  setToken("");
  navigate("/student", { replace: true });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 p-4">
      {!mustChange ? (
        <form
          onSubmit={handleLogin}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-10 flex flex-col items-center"
        >
          <h2 className="text-3xl font-extrabold mb-2 text-center text-blue-700 tracking-tight">Student Portal</h2>
          <p className="text-gray-500 text-center mb-8">Login with your email or student ID and password</p>

          <input
            type="text"
            placeholder="Email or Student ID"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="w-full border border-gray-300 p-4 mb-4 rounded-xl focus:ring-2 focus:ring-blue-400 focus:outline-none text-lg"
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 p-4 mb-6 rounded-xl focus:ring-2 focus:ring-blue-400 focus:outline-none text-lg"
            required
          />

          <button
            type="submit"
            className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition text-lg"
          >
            Login
          </button>
          {error && <div className="mt-3 text-red-600">{error}</div>}
        </form>
      ) : (
        <form
          onSubmit={handleChangePassword}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-10 flex flex-col items-center"
        >
          <h2 className="text-3xl font-extrabold mb-2 text-center text-blue-700 tracking-tight">Change Password</h2>
          <p className="text-gray-500 text-center mb-8">Please set a new password to continue</p>

          <input
            type="password"
            placeholder="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full border border-gray-300 p-4 mb-6 rounded-xl focus:ring-2 focus:ring-blue-400 focus:outline-none text-lg"
            required
          />
          <button
            type="submit"
            className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition text-lg"
          >
            Update Password
          </button>
          {error && <div className="mt-3 text-red-600">{error}</div>}
        </form>
      )}
    </div>
  );
}
