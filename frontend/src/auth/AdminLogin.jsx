import { useState } from "react";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    // Replace with backend API call
    if (username === "admin" && password === "admin123") {
      alert("Admin login successful ✅");
    } else {
      alert("Invalid admin credentials ❌");
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <form onSubmit={handleLogin} className="bg-white p-6 rounded-2xl shadow-md w-96">
        <h2 className="text-2xl font-bold mb-4 text-center">Admin Login</h2>
        
        <input
          type="text"
          placeholder="Admin Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full border p-2 mb-3 rounded"
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border p-2 mb-4 rounded"
          required
        />

        <button type="submit" className="w-full bg-red-500 text-white p-2 rounded hover:bg-red-600">
          Login
        </button>
      </form>
    </div>
  );
}
