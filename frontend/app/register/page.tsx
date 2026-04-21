"use client";

import Link from "next/link";
import { useState } from "react";

const BASE_URL = "http://127.0.0.1:8000";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const getErrorMessage = (data: any) => {
    if (typeof data?.detail === "string") return data.detail;
    if (Array.isArray(data?.detail) && data.detail.length > 0) {
      return data.detail[0]?.msg || "Registration failed.";
    }
    return "Registration failed.";
  };

  const handleRegister = async () => {
    setError("");
    setMessage("");

    if (!username.trim() || !password.trim()) {
      setError("Username and password are required.");
      return;
    }

    try {
      const res = await fetch(`${BASE_URL}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username,
          password
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(getErrorMessage(data));
        return;
      }

      localStorage.setItem("register_success", "true");
      window.location.href = "/login";
    } catch {
      setError("Could not connect to backend.");
    }
  };

  return (
    <main className="min-h-screen bg-white p-6 text-[#444441]">
      <div className="mx-auto max-w-md rounded-3xl bg-[#EEEDEF] p-6">
        <h1 className="mb-2 text-3xl font-bold text-[#7B2FBE]">Register</h1>
        <p className="mb-6 text-sm">Create your AEGIS account</p>

        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-[#7B2FBE]"
          />
        </div>

        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-[#7B2FBE]"
          />
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
            {message}
          </div>
        )}

        <button
          onClick={handleRegister}
          className="w-full rounded-xl bg-[#7B2FBE] px-4 py-3 font-medium text-white hover:opacity-90"
        >
          Register
        </button>

        <p className="mt-4 text-sm">
          Already have an account?{" "}
          <Link href="/login" className="text-[#7B2FBE] underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}