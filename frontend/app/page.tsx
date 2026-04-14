"use client";

import Link from "next/link";
import { useState } from "react";
import ChallengeBanner from "../components/ChallengeBanner";
import ReflectionCard from "../components/ReflectionCard";
import TransparencyPanel from "../components/TransparencyPanel";
import MessageList from "../components/MessageList";
import MessageInput from "../components/MessageInput";
import { mockResponse } from "../lib/mockData";
import type { Message, MockResponse } from "../types/aegis";

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentResponse, setCurrentResponse] = useState<MockResponse | null>(
  null
);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage = input;

    setMessages((prev) => [
      ...prev,
      { role: "user", content: userMessage },
      { role: "assistant", content: mockResponse.main_response },
    ]);

    setCurrentResponse(mockResponse);
    setInput("");
  };

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
            href="/report"
            className="rounded-xl bg-[#7B2FBE] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            View Report
          </Link>
        </header>

        <div className="flex flex-1 gap-6">
          <section className="flex flex-1 flex-col rounded-2xl bg-[#EEEDFE] p-4 shadow-sm">
            {currentResponse?.ui_hints.show_challenge_banner &&
              currentResponse.challenge && (
                <ChallengeBanner prompt={currentResponse.challenge.prompt} />
              )}

            <MessageList messages={messages} />

            {currentResponse?.ui_hints.show_reflection_card && (
              <ReflectionCard
                prompt={currentResponse.reflection.reflection_prompt}
              />
            )}

            <MessageInput
              input={input}
              onInputChange={setInput}
              onSend={handleSend}
            />
          </section>

          {currentResponse?.ui_hints.show_transparency_panel && (
            <TransparencyPanel
              explanation={currentResponse.transparency.explanation}
              confidenceBand={currentResponse.transparency.confidence_band}
              whatToVerify={currentResponse.transparency.what_to_verify}
              uncertaintyFlag={currentResponse.transparency.uncertainty_flag}
            />
          )}
        </div>
      </main>
    </div>
  );
}