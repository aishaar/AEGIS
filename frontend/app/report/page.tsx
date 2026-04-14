"use client";

import { mockReport } from "../../lib/mockData";

type MetricCardProps = {
  label: string;
  value: number;
  description: string;
  invert?: boolean;
};

function MetricCard({
  label,
  value,
  description,
  invert = false,
}: MetricCardProps) {
  const percent = Math.round(value * 100);

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#7B2FBE]">{label}</h2>
        <span className="text-sm font-medium text-[#444441]">{percent}%</span>
      </div>

      <p className="mt-2 text-sm text-gray-600">{description}</p>

      <div className="mt-4 h-3 w-full rounded-full bg-[#EEEDFE]">
        <div
          className="h-3 rounded-full bg-[#7B2FBE]"
          style={{ width: `${percent}%` }}
        />
      </div>

      <p className="mt-2 text-xs text-gray-500">
        {invert
          ? "Lower is better for this metric."
          : "Higher is better for this metric."}
      </p>
    </div>
  );
}

export default function ReportPage() {
  const engagementBadgeClass =
    mockReport.metrics.engagement_level === "high"
      ? "bg-green-100 text-green-700"
      : mockReport.metrics.engagement_level === "medium"
      ? "bg-amber-100 text-amber-700"
      : "bg-red-100 text-red-700";

  return (
    <div className="min-h-screen bg-white text-[#444441]">
      <main className="mx-auto max-w-6xl p-6">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-[#7B2FBE]">AEGIS Report</h1>
          <p className="mt-2 text-sm text-[#444441]">
            Cognitive engagement summary for the current session
          </p>
        </header>

        <section className="mb-6 rounded-2xl bg-[#EEEDFE] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#7B2FBE]">
                Session Summary
              </h2>
              <p className="mt-2 text-sm text-gray-700">
                {mockReport.metrics.interpretation}
              </p>
            </div>

            <span
              className={`rounded-full px-4 py-2 text-sm font-medium ${engagementBadgeClass}`}
            >
              {mockReport.metrics.engagement_level}
            </span>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          <MetricCard
            label="RPI"
            value={mockReport.metrics.rpi}
            description="Reliance / passivity indicator"
            invert
          />
          <MetricCard
            label="SUR"
            value={mockReport.metrics.sur}
            description="Scaffold uptake rate"
          />
          <MetricCard
            label="RAF"
            value={mockReport.metrics.raf}
            description="Reflection activity frequency"
          />
        </section>
      </main>
    </div>
  );
}