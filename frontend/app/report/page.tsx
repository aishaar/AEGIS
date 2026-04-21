"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { MetricsReport } from "../../types/aegis";

const BASE_URL = "http://localhost:8000";

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

    fetch(`${BASE_URL}/report/${sessionId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Failed to load report: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setReport(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Could not load report. The session may not exist or the backend is offline.");
        setLoading(false);
      });
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
        <header className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#7B2FBE]">AEGIS</h1>
            <p className="text-xs font-medium tracking-widest text-[#7B2FBE] uppercase mt-0.5">
              Adaptive Engine for Guided Intelligent Scaffolding
            </p>
            <p className="mt-1 text-sm italic text-[#888780]">Think More, Depend Less</p>
          </div>
          <Link
            href={report.session_id ? `/?session=${report.session_id}` : "/"}
            className="rounded-xl bg-[#BA7517] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Back to Chat
          </Link>
        </header>

        <section className="mb-6 rounded-2xl bg-[#EEEDFE] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#7B2FBE]">Session Summary</h2>
              <p className="mt-1 text-xs text-gray-400 font-mono">{report.session_id}</p>
              <p className="mt-2 text-sm text-gray-700">{metrics.interpretation}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className={`rounded-full px-4 py-2 text-sm font-medium ${engagementBadgeClass}`}>
                {metrics.engagement_level}
              </span>
              <span className="text-xs text-gray-400">{report.turn_count} turns</span>
            </div>
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
