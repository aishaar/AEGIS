"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ReportData = {
  session_id: string;
  turn_count: number;
  metrics: {
    rpi?: number;
    sur?: number;
    raf?: number;
    engagement_level?: string;
    scaffold_stage_label?: string;
    turn_count?: number;
    interpretation?: string;
  };
  raw_events: {
    rpi_events?: string[];
    reflection_events?: string[];
    transparency_events?: string[];
  };
};

export default function ReportPage() {
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const storedSessionId = localStorage.getItem("session_id");

    if (!storedSessionId) {
      setError("No session_id found. Please chat on the home page first.");
      setLoading(false);
      return;
    }

    const token = localStorage.getItem("access_token");

    fetch(`http://127.0.0.1:8000/report/${storedSessionId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Failed to load report: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setReport(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load report.");
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-white text-[#444441]">
      <main className="mx-auto flex min-h-screen max-w-7xl flex-col p-6">
        <header className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#7B2FBE]">AEGIS</h1>
            <p className="mt-2 text-sm text-[#444441]">
              Adaptive interface for AI interaction
            </p>
          </div>

          <Link
            href={report?.session_id ? `/?session=${report.session_id}` : "/"}
            className="rounded-xl bg-[#BA7517] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Back to Chat
          </Link>
        </header>

        <div className="rounded-3xl bg-[#EEEDEF] p-5">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-3xl font-bold text-[#7B2FBE]">Session Report</h2>
            {report?.session_id && (
              <span className="rounded-xl bg-white px-4 py-2 text-sm text-[#444441]">
                Session: {report.session_id}
              </span>
            )}
          </div>

          {loading && (
            <div className="rounded-3xl bg-white p-6">
              <p>Loading report...</p>
            </div>
          )}

          {!loading && error && (
            <div className="rounded-3xl bg-white p-6">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {!loading && !error && report && (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[2fr_1fr]">
              <section className="rounded-3xl bg-white p-6">
                <div className="mb-6 rounded-2xl bg-[#EEEDEF] p-5">
                  <p className="mb-2">
                    <strong>Session ID:</strong> {report.session_id}
                  </p>
                  <p>
                    <strong>Turn Count:</strong> {report.turn_count}
                  </p>
                </div>

                <div className="mb-6">
                  <h3 className="mb-4 text-2xl font-bold text-[#444441]">Raw Events</h3>

                  <div className="mb-4 rounded-2xl bg-[#EEEDEF] p-4">
                    <h4 className="mb-3 text-lg font-semibold">RPI Events</h4>
                    <pre className="overflow-auto whitespace-pre-wrap break-words rounded-xl bg-white p-4 text-sm">
                      {JSON.stringify(report.raw_events?.rpi_events ?? [], null, 2)}
                    </pre>
                  </div>

                  <div className="mb-4 rounded-2xl bg-[#EEEDEF] p-4">
                    <h4 className="mb-3 text-lg font-semibold">Reflection Events</h4>
                    <pre className="overflow-auto whitespace-pre-wrap break-words rounded-xl bg-white p-4 text-sm">
                      {JSON.stringify(report.raw_events?.reflection_events ?? [], null, 2)}
                    </pre>
                  </div>

                  <div className="rounded-2xl bg-[#EEEDEF] p-4">
                    <h4 className="mb-3 text-lg font-semibold">Transparency Events</h4>
                    <pre className="overflow-auto whitespace-pre-wrap break-words rounded-xl bg-white p-4 text-sm">
                      {JSON.stringify(report.raw_events?.transparency_events ?? [], null, 2)}
                    </pre>
                  </div>
                </div>
              </section>

              <aside className="rounded-3xl bg-[#EEEDEF] p-5">
                <h3 className="mb-5 text-2xl font-bold text-[#7B2FBE]">Metrics</h3>

                <div className="mb-4 rounded-2xl bg-white p-4">
                  <p className="mb-2 font-semibold">RPI</p>
                  <p>{report.metrics?.rpi ?? "N/A"}</p>
                </div>

                <div className="mb-4 rounded-2xl bg-white p-4">
                  <p className="mb-2 font-semibold">SUR</p>
                  <p>{report.metrics?.sur ?? "N/A"}</p>
                </div>

                <div className="mb-4 rounded-2xl bg-white p-4">
                  <p className="mb-2 font-semibold">RAF</p>
                  <p>{report.metrics?.raf ?? "N/A"}</p>
                </div>

                <div className="mb-4 rounded-2xl bg-white p-4">
                  <p className="mb-2 font-semibold">Engagement Level</p>
                  <span className="inline-block rounded-full bg-[#BA7517]/15 px-3 py-1 text-sm text-[#BA7517]">
                    {report.metrics?.engagement_level ?? "N/A"}
                  </span>
                </div>

                <div className="mb-4 rounded-2xl bg-white p-4">
                  <p className="mb-2 font-semibold">Scaffold Stage</p>
                  <p>{report.metrics?.scaffold_stage_label ?? "N/A"}</p>
                </div>

                <div className="rounded-2xl bg-white p-4">
                  <p className="mb-2 font-semibold">Interpretation</p>
                  <p>{report.metrics?.interpretation ?? "N/A"}</p>
                </div>
              </aside>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}