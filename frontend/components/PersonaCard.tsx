"use client";

import type { PersonaKey } from "../lib/personas";
import { PERSONA_META } from "../lib/personas";

type Props = {
  persona: PersonaKey;
  isActive: boolean;
  isRunning: boolean;
  onRun: () => void;
};

const STYLES: Record<PersonaKey, { border: string; activeBg: string; btn: string; tag: string }> = {
  passive: {
    border: "border-[#C4B5FD]",
    activeBg: "bg-[#F5F3FF]",
    btn: "bg-[#7C3AED] hover:bg-[#6D28D9]",
    tag: "bg-[#EDE9FE] text-[#5B21B6]",
  },
  curious: {
    border: "border-[#6EE7B7]",
    activeBg: "bg-[#ECFDF5]",
    btn: "bg-[#059669] hover:bg-[#047857]",
    tag: "bg-[#D1FAE5] text-[#065F46]",
  },
  critical: {
    border: "border-[#A78BFA]",
    activeBg: "bg-[#F5F3FF]",
    btn: "bg-[#6D28D9] hover:bg-[#5B21B6]",
    tag: "bg-[#EDE9FE] text-[#4C1D95]",
  },
};

export default function PersonaCard({ persona, isActive, isRunning, onRun }: Props) {
  const meta = PERSONA_META[persona];
  const s = STYLES[persona];

  return (
    <div
      className={`rounded-2xl border-2 p-4 shadow-sm transition-all ${s.border} ${
        isActive ? s.activeBg : "bg-white"
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{meta.emoji}</span>
        <h3 className="text-base font-semibold text-[#374151]">{meta.label}</h3>
        {isActive && (
          <span
            className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
              isRunning
                ? "bg-amber-100 text-amber-700"
                : "bg-green-100 text-green-700"
            }`}
          >
            {isRunning ? "Running…" : "Done"}
          </span>
        )}
      </div>

      <p className="text-sm text-[#6B7280] mb-3">{meta.description}</p>

      <div className="flex flex-wrap gap-1 mb-3">
        {meta.examples.map((ex, i) => (
          <span key={i} className={`text-xs px-2 py-0.5 rounded-full ${s.tag}`}>
            {ex}
          </span>
        ))}
      </div>

      <button
        onClick={onRun}
        disabled={isRunning}
        className={`w-full rounded-xl px-4 py-2 text-sm font-medium text-white transition-colors ${s.btn} disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isRunning && isActive ? "Simulating…" : "Run Simulation"}
      </button>
    </div>
  );
}
