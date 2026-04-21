"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const BASE_URL = "http://127.0.0.1:8000";

type SessionItem = {
  session_id: string;
  created_at?: string;
  updated_at?: string;
  turn_count: number;
  preview?: string;
};

export default function HistoryPage() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [username, setUsername] = useState<string | null>(null);
  const [backToChatHref, setBackToChatHref] = useState("/");

  const loadSessions = async () => {
    const token = localStorage.getItem("access_token");
    const savedUsername = localStorage.getItem("username");
    const currentSessionId = localStorage.getItem("session_id");

    if (!token) {
      window.location.href = "/login";
      return;
    }

    if (savedUsername) {
      setUsername(savedUsername);
    }

    if (currentSessionId) {
      setBackToChatHref(`/?session=${currentSessionId}`);
    }

    try {
      setLoading(true);
      setError("");

      const res = await fetch(`${BASE_URL}/my-sessions`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Failed to load history.");
      }

      setSessions(data.sessions || []);
    } catch (err: any) {
      setError(err.message || "Failed to load history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleDelete = async (sessionId: string) => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      window.location.href = "/login";
      return;
    }

    const confirmed = window.confirm("Delete this conversation history?");
    if (!confirmed) return;

    try {
      const res = await fetch(`${BASE_URL}/sessions/${sessionId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Failed to delete session.");
      }

      setSessions((prev) => prev.filter((s) => s.session_id !== sessionId));

      const currentSessionId = localStorage.getItem("session_id");
      if (currentSessionId === sessionId) {
        localStorage.removeItem("session_id");
        setBackToChatHref("/");
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete session.");
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#444441]">
      <main className="mx-auto flex min-h-screen max-w-6xl flex-col p-6">
        <header className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#7B2FBE]">AEGIS</h1>
            <p className="mt-2 text-sm text-[#444441]">
              Conversation History
            </p>
          </div>

          <div className="flex items-center gap-3">
            {username && (
              <span className="text-sm font-medium text-[#444441]">
                Hi, {username}
              </span>
            )}

            <Link
              href={backToChatHref}
              className="rounded-xl bg-[#BA7517] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Back to Chat
            </Link>
          </div>
        </header>

        <div className="rounded-3xl bg-[#EEEDEF] p-5">
          <h2 className="mb-5 text-3xl font-bold text-[#7B2FBE]">History</h2>

          {loading && (
            <div className="rounded-2xl bg-white p-5">
              <p>Loading conversation history...</p>
            </div>
          )}

          {!loading && error && (
            <div className="rounded-2xl bg-white p-5">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {!loading && !error && sessions.length === 0 && (
            <div className="rounded-2xl bg-white p-5">
              <p>No saved conversations yet.</p>
            </div>
          )}

          {!loading && !error && sessions.length > 0 && (
            <div className="space-y-4">
              {sessions.map((session) => (
                <div
                  key={session.session_id}
                  className="rounded-2xl bg-white p-5 shadow-sm"
                >
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-[#7B2FBE]">
                        Session ID
                      </p>
                      <p className="break-all text-sm text-[#444441]">
                        {session.session_id}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/?session=${session.session_id}`}
                        className="rounded-xl bg-[#7B2FBE] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                      >
                        Open
                      </Link>

                      <button
                        onClick={() => handleDelete(session.session_id)}
                        className="rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
                    <div className="rounded-xl bg-[#EEEDEF] p-3">
                      <p className="font-medium">Preview</p>
                      <p className="mt-1 text-[#444441]">
                        {session.preview || "No preview available"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-[#EEEDEF] p-3">
                      <p className="font-medium">Turn Count</p>
                      <p className="mt-1 text-[#444441]">{session.turn_count}</p>
                    </div>

                    <div className="rounded-xl bg-[#EEEDEF] p-3">
                      <p className="font-medium">Updated At</p>
                      <p className="mt-1 text-[#444441]">
                        {session.updated_at || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}