"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const BASE_URL = "http://127.0.0.1:8000";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    const registered = localStorage.getItem("register_success");
    if (registered === "true") {
      setMessage("Registration successful. Please log in.");
      localStorage.removeItem("register_success");
    }
  }, []);

  const getErrorMessage = (data: any) => {
    if (typeof data?.detail === "string") return data.detail;
    if (Array.isArray(data?.detail) && data.detail.length > 0) {
      return data.detail[0]?.msg || "Login failed.";
    }
    return "Login failed.";
  };

  const handleLogin = async () => {
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("Username and password are required.");
      return;
    }

    try {
      const res = await fetch(`${BASE_URL}/login`, {
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

      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("user_id", data.user_id);
      localStorage.setItem("username", data.username);

      window.location.href = "/";
    } catch {
      setError("Could not connect to backend.");
    }
  };

  return (
    <main className="min-h-screen bg-white p-6 text-[#444441]">
      <div className="mx-auto max-w-md rounded-3xl bg-[#EEEDEF] p-6">
        <h1 className="mb-2 text-3xl font-bold text-[#7B2FBE]">Login</h1>
        <p className="mb-6 text-sm">Log in to your AEGIS account</p>

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

        {message && (
            <div className="mb-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
                {message}
            </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          className="w-full rounded-xl bg-[#7B2FBE] px-4 py-3 font-medium text-white hover:opacity-90"
        >
          Login
        </button>

        <p className="mt-4 text-sm">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-[#7B2FBE] underline">
            Register
          </Link>
        </p>
      </div>
    </main>
  );
}