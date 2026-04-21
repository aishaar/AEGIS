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
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getReport } from "../../lib/api";
import type { MetricsReport } from "../../types/aegis";

type MetricCardProps = {
  label: string;
  value: number | null;
  description: string;
  invert?: boolean;
};

function MetricCard({ label, value, description, invert = false }: MetricCardProps) {
  const isNA = value === null;
  const percent = isNA ? 0 : Math.round(value * 100);

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#7B2FBE]">{label}</h2>
        <span className="text-sm font-medium text-[#444441]">
          {isNA ? "N/A" : `${percent}%`}
        </span>
      </div>

      <p className="mt-2 text-sm text-gray-600">{description}</p>

      <div className="mt-4 h-3 w-full rounded-full bg-[#EEEDFE]">
        {isNA ? (
          <div className="h-3 w-full rounded-full bg-gray-200" />
        ) : (
          <div
            className="h-3 rounded-full bg-[#7B2FBE]"
            style={{ width: `${percent}%` }}
          />
        )}
      </div>

      <p className="mt-2 text-xs text-gray-500">
        {isNA
          ? "Not available for this session."
          : invert
          ? "Lower is better for this metric."
          : "Higher is better for this metric."}
      </p>
    </div>
  );
}

function ReportContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");

  const [report, setReport] = useState<MetricsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError("No session ID provided. Add ?session=<id> to the URL.");
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
    getReport(sessionId)
      .then(setReport)
      .catch(() => setError("Could not load report. The session may not exist or the backend is offline."))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-sm text-gray-500">Loading report…</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-sm text-red-500">{error ?? "Unknown error."}</p>
      </div>
    );
  }

  const { metrics } = report;

  const engagementBadgeClass =
    metrics.engagement_level === "high"
      ? "bg-green-100 text-green-700"
      : metrics.engagement_level === "medium"
      ? "bg-amber-100 text-amber-700"
      : "bg-red-100 text-red-700";

  return (
    <div className="min-h-screen bg-white text-[#444441]">
      <main className="mx-auto max-w-6xl p-6">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-[#7B2FBE]">AEGIS Report</h1>
          <p className="mt-2 text-sm text-[#444441]">
            Cognitive engagement summary · {report.turn_count} turns · session{" "}
            <span className="font-mono text-xs text-gray-400">{report.session_id}</span>
          </p>
        </header>

        <section className="mb-6 rounded-2xl bg-[#EEEDFE] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#7B2FBE]">Session Summary</h2>
              <p className="mt-2 text-sm text-gray-700">{metrics.interpretation}</p>
            </div>
            <span className={`rounded-full px-4 py-2 text-sm font-medium ${engagementBadgeClass}`}>
              {metrics.engagement_level}
            </span>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          <MetricCard
            label="RPI"
            value={metrics.rpi}
            description="Reliance / passivity indicator"
            invert
          />
          <MetricCard
            label="SUR"
            value={metrics.sur}
            description="Scaffold uptake rate"
          />
          <MetricCard
            label="RAF"
            value={metrics.raf}
            description="Reflection activity frequency"
          />
        </section>
      </main>
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white">
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      }
    >
      <ReportContent />
    </Suspense>
  );
}
