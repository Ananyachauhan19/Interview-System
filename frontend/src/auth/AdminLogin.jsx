import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, setToken } from "../utils/api";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await api.adminLogin(email, password);
      setToken(res.token);
      localStorage.setItem("isAdmin", "true");
      alert("✅ Admin login successful");
      navigate("/admin/event", { replace: true });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-100 via-pink-100 to-purple-100 p-4">
      <form
        onSubmit={handleLogin}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-10 flex flex-col items-center"
      >
        <h2 className="text-3xl font-extrabold mb-2 text-center text-red-700 tracking-tight">Admin Portal</h2>
        <p className="text-gray-500 text-center mb-8">Please login to manage the interview system</p>

        <input
          type="email"
          placeholder="Admin Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-gray-300 p-4 mb-4 rounded-xl focus:ring-2 focus:ring-red-400 focus:outline-none text-lg"
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-gray-300 p-4 mb-6 rounded-xl focus:ring-2 focus:ring-red-400 focus:outline-none text-lg"
          required
        />

        <button
          type="submit"
          className="w-full bg-red-600 text-white p-4 rounded-xl font-bold shadow-lg hover:bg-red-700 transition text-lg"
        >
          Login
        </button>
        {error && <div className="mt-3 text-red-600">{error}</div>}
      </form>
    </div>
  );
}
