import { useState } from "react";

export default function StudentLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    // Replace with backend API call
    if (email === "student@example.com" && password === "student123") {
      alert("Student login successful ✅");
    } else {
      alert("Invalid student credentials ❌");
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-blue-100">
      <form onSubmit={handleLogin} className="bg-white p-6 rounded-2xl shadow-md w-96">
        <h2 className="text-2xl font-bold mb-4 text-center">Student Login</h2>
        
        <input
          type="email"
          placeholder="Student Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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

        <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600">
          Login
        </button>
      </form>
    </div>
  );
}
