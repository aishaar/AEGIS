"use client";

import Link from "next/link";
import { useState } from "react";
import ChallengeBanner from "../components/ChallengeBanner";
import ReflectionCard from "../components/ReflectionCard";
import TransparencyPanel from "../components/TransparencyPanel";
import MessageList from "../components/MessageList";
import MessageInput from "../components/MessageInput";
import type { Message, MockResponse } from "../types/aegis";

const BASE_URL = "http://localhost:8000";

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentResponse, setCurrentResponse] = useState<MockResponse | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setError(null);
    setIsLoading(true);

    setMessages(prev => [
  ...prev,
  { id: Date.now().toString(), role: "user", content: userMessage }
]);

    try {
      const payload: { message: string; session_id?: string } = {
        message: userMessage
      };
      if (sessionId) {
        payload.session_id = sessionId;
      }

      const res = await fetch(`${BASE_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(`Backend error: ${res.status}`);
      }

      const data = await res.json();

      if (!sessionId) {
        setSessionId(data.session_id);
      }

      const backendResponse: MockResponse = {
        main_response: data.response.main_response,
        transparency: data.response.transparency ?? {
          explanation: "",
          confidence_band: "medium",
          what_to_verify: "",
          uncertainty_flag: false
        },
        reflection: data.response.reflection ?? {
          reflection_prompt: "",
          reflection_style: "guided",
          is_required_this_turn: false
        },
        challenge: data.response.challenge,
        ui_hints: {
          show_transparency_panel: data.response.ui_hints.show_transparency_panel,
          show_reflection_card: data.response.ui_hints.show_reflection_card,
          show_challenge_banner: data.response.ui_hints.show_challenge_banner
        }
      };

      setMessages(prev => [
  ...prev,
  { id: (Date.now() + 1).toString(), role: "assistant", content: data.response.main_response }
]);

      setCurrentResponse(backendResponse);

    } catch (err) {
      setMessages(prev => [
  ...prev,
  {
    id: (Date.now() + 1).toString(),
    role: "assistant",
    content: "Backend is offline. Please start the server and try again."
  }
]);
    } finally {
      setIsLoading(false);
    }
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

          <div className="flex items-center gap-3">
            {sessionId && (
              <Link
                href={`/report?session=${sessionId}`}
                className="rounded-xl bg-[#BA7517] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                View Report
              </Link>
            )}
            <Link
              href="/report"
              className="rounded-xl bg-[#7B2FBE] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Reports
            </Link>
          </div>
        </header>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex flex-1 gap-6">
          <section className="flex flex-1 flex-col rounded-2xl bg-[#EEEDFE] p-4 shadow-sm">
            {currentResponse?.ui_hints.show_challenge_banner &&
              currentResponse.challenge && (
                <ChallengeBanner prompt={currentResponse.challenge.prompt} />
              )}

            <MessageList messages={messages} />

            {isLoading && (
              <div className="px-4 py-2 text-sm text-[#7B2FBE] italic">
                AEGIS is thinking...
              </div>
            )}

            {currentResponse?.ui_hints.show_reflection_card &&
              currentResponse.reflection?.is_required_this_turn && (
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

        {sessionId && (
          <div className="mt-4 text-center text-xs text-[#888780]">
            Session: {sessionId}
          </div>
        )}
      </main>
    </div>
  );
}