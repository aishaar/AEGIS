"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import PersonaCard from "../../components/PersonaCard";
import SimulationMessage, { type SimMessage } from "../../components/SimulationMessage";
import { PERSONA_MESSAGES, type PersonaKey } from "../../lib/personas";

const BASE_URL = "http://localhost:8000";

type FinalReport = {
  session_id: string;
  turn_count: number;
  metrics: {
    rpi: number;
    sur: number;
    raf: number | null;
    engagement_level: string;
    scaffold_stage_label: string;
    interpretation: string;
  };
  persona_summary: {
    dominant_persona: string;
    persona_scores: Record<string, number>;
    overall_persona_score: number;
  };
};

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function MetricBar({
  label,
  value,
  desc,
  invert,
}: {
  label: string;
  value: number | null;
  desc: string;
  invert?: boolean;
}) {
  const pct = value === null ? null : Math.round(value * 100);
  const barColor = invert ? "bg-[#F87171]" : "bg-[#34D399]";

  return (
    <div className="rounded-xl bg-[#F9FAFB] p-4 border border-[#E5E7EB]">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-semibold text-[#6D28D9]">{label}</span>
        <span className="text-sm font-bold text-[#374151]">
          {pct === null ? "N/A" : `${pct}%`}
        </span>
      </div>
      <p className="text-xs text-[#9CA3AF] mb-2">{desc}</p>
      <div className="h-2 w-full rounded-full bg-[#E5E7EB]">
        {pct !== null && (
          <div
            className={`h-2 rounded-full transition-all duration-700 ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
    </div>
  );
}

export default function EvaluationPage() {
  const [activePersona, setActivePersona] = useState<PersonaKey | null>(null);
  const [running, setRunning] = useState(false);
  const [messages, setMessages] = useState<SimMessage[]>([]);
  const [typing, setTyping] = useState(false);
  const [report, setReport] = useState<FinalReport | null>(null);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) window.location.href = "/login";
  }, []);

  // Smart scroll — only follows new messages if user is already near the bottom
  useEffect(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < 120) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages, typing]);

  const runSimulation = async (persona: PersonaKey) => {
    const token = localStorage.getItem("access_token");
    if (!token) { window.location.href = "/login"; return; }

    setRunning(true);
    setActivePersona(persona);
    setMessages([]);
    setReport(null);
    setError(null);

    const msgs = PERSONA_MESSAGES[persona];
    setTotal(msgs.length);
    setProgress(0);

    const sid = crypto.randomUUID();
    const authHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    for (let i = 0; i < msgs.length; i++) {
      const message = msgs[i];

      setMessages((prev) => [
        ...prev,
        { id: `u-${i}`, role: "user", content: message },
      ]);
      setTyping(true);
      await sleep(500);

      try {
        const res = await fetch(`${BASE_URL}/chat`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({ message, session_id: sid }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        setTyping(false);

        setMessages((prev) => [
          ...prev,
          {
            id: `a-${i}`,
            role: "assistant",
            content: data.response.main_response,
            route: data.response.route_used,
            stage: data.response.ui_hints?.scaffold_stage_label,
            engagement: data.response.ui_hints?.engagement_level,
            passivity_alert: data.state_snapshot?.passivity_alert,
          },
        ]);

        setProgress(i + 1);
        await sleep(1000);
      } catch (e: any) {
        setTyping(false);
        setError(`Turn ${i + 1} failed — ${e.message}. Is the backend running?`);
        setRunning(false);
        return;
      }
    }

    try {
      const reportRes = await fetch(`${BASE_URL}/report/${sid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const reportData = await reportRes.json();
      setReport(reportData);
    } catch {
      setError("Simulation complete but could not load the final report.");
    }

    setRunning(false);
  };

  const dominantColor: Record<string, string> = {
    passive:  "text-[#7C3AED]",
    curious:  "text-[#059669]",
    critical: "text-[#6D28D9]",
    mixed:    "text-[#D97706]",
  };

  const personaBarColor: Record<string, string> = {
    passive:  "bg-[#A78BFA]",
    curious:  "bg-[#34D399]",
    critical: "bg-[#7C3AED]",
  };

  return (
    <div className="min-h-screen bg-[#0F0B1E] text-white">
      <main className="mx-auto flex min-h-screen max-w-7xl flex-col p-6">

        {/* Header */}
        <header className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#C4B5FD]">AEGIS</h1>
            <p className="text-xs font-medium tracking-widest text-[#A78BFA] uppercase mt-0.5">
              Adaptive Engine for Guided Intelligent Scaffolding
            </p>
            <p className="mt-1 text-sm italic text-[#6EE7B7]">Evaluation Demo</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-xl border border-[#4C1D95] px-4 py-2 text-sm font-medium text-[#C4B5FD] hover:bg-[#1E1635]"
            >
              Back to Chat
            </Link>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.href = "/login";
              }}
              className="rounded-xl bg-[#4C1D95] px-4 py-2 text-sm font-medium text-white hover:bg-[#5B21B6]"
            >
              Logout
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-4 rounded-xl border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="flex flex-1 gap-6 min-h-0">

          {/* Left: Persona picker */}
          <aside className="w-72 shrink-0 flex flex-col gap-4">
            <div className="rounded-2xl bg-[#1A1630] p-4 border border-[#2D1F5E]">
              <h2 className="text-base font-semibold text-[#C4B5FD]">Simulation Personas</h2>
              <p className="mt-1 text-xs text-[#6B7280]">
                Pick a persona to auto-play a full 12-turn conversation and watch how AEGIS adapts.
              </p>
            </div>

            {(["passive", "curious", "critical"] as PersonaKey[]).map((p) => (
              <PersonaCard
                key={p}
                persona={p}
                isActive={activePersona === p}
                isRunning={running}
                onRun={() => runSimulation(p)}
              />
            ))}
          </aside>

          {/* Right: Chat + scores */}
          <section className="flex flex-1 flex-col gap-4 min-w-0">

            {/* Progress bar */}
            {running && (
              <div className="rounded-xl bg-[#1A2820] border border-[#2D4A38] px-4 py-2 flex items-center gap-3">
                <span className="text-xs text-[#6EE7B7] font-medium">
                  Turn {progress} / {total}
                </span>
                <div className="flex-1 h-2 rounded-full bg-[#0D1F15]">
                  <div
                    className="h-2 rounded-full bg-[#34D399] transition-all duration-500"
                    style={{ width: `${total ? (progress / total) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-xs text-[#4B5563]">simulating…</span>
              </div>
            )}

            {/* Chat window */}
            <div
              className="flex-1 rounded-2xl bg-white border border-[#E5E7EB] flex flex-col overflow-hidden shadow-lg"
              style={{ minHeight: "380px", maxHeight: "520px" }}
            >
              {messages.length === 0 && !running ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
                  <span className="text-4xl">🤖</span>
                  <p className="text-sm text-center text-[#9CA3AF]">
                    Select a persona on the left and click{" "}
                    <span className="font-medium text-[#6D28D9]">Run Simulation</span> to
                    watch the conversation unfold.
                  </p>
                </div>
              ) : (
                <div
                  ref={chatContainerRef}
                  className="flex-1 overflow-y-auto p-4 space-y-3"
                >
                  {messages.map((msg) => (
                    <SimulationMessage key={msg.id} message={msg} />
                  ))}

                  {typing && (
                    <div className="flex items-center gap-2 pl-1 text-sm italic text-[#6D28D9]">
                      <span className="inline-flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#6D28D9] animate-bounce [animation-delay:0ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-[#6D28D9] animate-bounce [animation-delay:150ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-[#6D28D9] animate-bounce [animation-delay:300ms]" />
                      </span>
                      AEGIS is thinking…
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Final scores */}
            {report && (
              <div className="rounded-2xl bg-white border border-[#E5E7EB] p-5 shadow-lg">
                <h3 className="text-base font-semibold text-[#065F46] mb-4">
                  Final Evaluation Results
                </h3>

                {/* Top summary row */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl bg-[#F5F3FF] p-4 border border-[#DDD6FE]">
                    <p className="text-xs text-[#9CA3AF] uppercase tracking-wide mb-1">
                      Dominant Persona
                    </p>
                    <p className={`text-xl font-bold capitalize ${dominantColor[report.persona_summary?.dominant_persona] ?? "text-[#374151]"}`}>
                      {report.persona_summary?.dominant_persona ?? "—"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-[#ECFDF5] p-4 border border-[#A7F3D0]">
                    <p className="text-xs text-[#9CA3AF] uppercase tracking-wide mb-1">
                      Overall Score
                    </p>
                    <p className="text-xl font-bold text-[#059669]">
                      {report.persona_summary?.overall_persona_score?.toFixed(3) ?? "—"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-[#F5F3FF] p-4 border border-[#DDD6FE]">
                    <p className="text-xs text-[#9CA3AF] uppercase tracking-wide mb-1">
                      Engagement
                    </p>
                    <p className={`text-xl font-bold capitalize ${
                      report.metrics.engagement_level === "high"   ? "text-[#059669]"
                      : report.metrics.engagement_level === "medium" ? "text-[#D97706]"
                      : "text-[#DC2626]"
                    }`}>
                      {report.metrics.engagement_level}
                    </p>
                  </div>
                </div>

                {/* Persona score breakdown */}
                {report.persona_summary?.persona_scores && (
                  <div className="rounded-xl bg-[#F9FAFB] p-4 border border-[#E5E7EB] mb-4">
                    <p className="text-xs text-[#9CA3AF] uppercase tracking-wide mb-3">
                      Persona Score Breakdown
                    </p>
                    {Object.entries(report.persona_summary.persona_scores).map(([k, v]) => (
                      <div key={k} className="flex items-center gap-3 mb-2 last:mb-0">
                        <span className="w-16 text-sm capitalize text-[#374151]">{k}</span>
                        <div className="flex-1 h-2 rounded-full bg-[#E5E7EB]">
                          <div
                            className={`h-2 rounded-full transition-all duration-700 ${personaBarColor[k] ?? "bg-[#A78BFA]"}`}
                            style={{ width: `${Math.min(100, (v / 12) * 100)}%` }}
                          />
                        </div>
                        <span className="w-10 text-right text-xs text-[#6B7280]">
                          {v.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* RPI / SUR / RAF */}
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <MetricBar label="RPI" value={report.metrics.rpi} desc="Reliance / Passivity" invert />
                  <MetricBar label="SUR" value={report.metrics.sur} desc="Scaffold Uptake Rate" />
                  <MetricBar label="RAF" value={report.metrics.raf} desc="Reflection Activity" />
                </div>

                <p className="text-sm text-[#065F46] italic">
                  {report.metrics.interpretation}
                </p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
