import { useState } from "react";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    if (username === "admin" && password === "admin123") {
      alert("✅ Admin login successful");
    } else {
      alert("❌ Invalid admin credentials");
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
          type="text"
          placeholder="Admin Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
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
      </form>
    </div>
  );
}
