import { useState } from "react";

export default function StudentLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    if (email === "student@example.com" && password === "student123") {
      alert("✅ Student login successful");
    } else {
      alert("❌ Invalid student credentials");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 p-4">
      <form
        onSubmit={handleLogin}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-10 flex flex-col items-center"
      >
        <h2 className="text-3xl font-extrabold mb-2 text-center text-blue-700 tracking-tight">Student Portal</h2>
        <p className="text-gray-500 text-center mb-8">Login with your registered email and password</p>

        <input
          type="email"
          placeholder="Student Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
      </form>
    </div>
  );
}
