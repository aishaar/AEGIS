"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import ChallengeBanner from "../components/ChallengeBanner";
import ReflectionCard from "../components/ReflectionCard";
import TransparencyPanel from "../components/TransparencyPanel";
import MessageList from "../components/MessageList";
import MessageInput from "../components/MessageInput";
import type { Message, MockResponse } from "../types/aegis";

const BASE_URL = "http://localhost:8000";

const greetingMessages: Message[] = [
  { id: "greeting-1", role: "assistant", content: "Hi, I am AEGIS." },
  {
    id: "greeting-2",
    role: "assistant",
    content: "I am here to support your learning and guide your thinking."
  },
  {
    id: "greeting-3",
    role: "assistant",
    content: "What can I help you with today?"
  }
];

export default function Home() {
  const searchParams = useSearchParams();
  const hasInitialized = useRef(false);

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentResponse, setCurrentResponse] = useState<MockResponse | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSessionLoading, setIsSessionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const savedUsername = localStorage.getItem("username");
    const sessionFromUrl = searchParams.get("session");

    if (!token) {
      window.location.href = "/login";
      return;
    }

    if (savedUsername) {
      setUsername(savedUsername);
    }

    if (sessionFromUrl) {
      setIsSessionLoading(true);
      setError(null);

      fetch(`${BASE_URL}/sessions/${sessionFromUrl}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
        .then(async (res) => {
          if (!res.ok) {
            throw new Error(`Failed to load session: ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          setSessionId(data.session_id);

          const loadedMessages: Message[] = (data.interaction_history || []).map(
            (item: any, index: number) => ({
              id: `${data.session_id}-${index}`,
              role: item.role,
              content:
                typeof item.content === "string"
                  ? item.content
                  : item.content?.main_response || JSON.stringify(item.content)
            })
          );

          setMessages(loadedMessages);
          localStorage.setItem("session_id", data.session_id);
        })
        .catch(() => {
          setError("Failed to load this conversation.");
        })
        .finally(() => {
          setIsSessionLoading(false);
        });

      return;
    }

    // 只有第一次进入主页且没有 session 参数时，显示 greeting
    if (!hasInitialized.current) {
      setMessages(greetingMessages);
      setSessionId(null);
      setCurrentResponse(null);
      localStorage.removeItem("session_id");
      hasInitialized.current = true;
    }
  }, [searchParams]);

  const handleNewChat = () => {
    setMessages([]);
    setSessionId(null);
    setCurrentResponse(null);
    setError(null);
    setInput("");
    localStorage.removeItem("session_id");
    window.history.replaceState({}, "", "/");
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || isSessionLoading) return;

    const token = localStorage.getItem("access_token");
    if (!token) {
      window.location.href = "/login";
      return;
    }

    const userMessage = input.trim();
    setInput("");
    setError(null);
    setIsLoading(true);

    setMessages((prev) => [
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
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(`Backend error: ${res.status}`);
      }

      const data = await res.json();

      if (!sessionId) {
        setSessionId(data.session_id);
      }

      localStorage.setItem("session_id", data.session_id);

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

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.response.main_response
        }
      ]);

      setCurrentResponse(backendResponse);
    } catch (err) {
      setMessages((prev) => [
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
            {username && (
              <span className="text-sm font-medium text-[#444441]">
                Hi, {username}
              </span>
            )}

            <button
              onClick={handleNewChat}
              className="rounded-xl border border-[#BA7517] px-4 py-2 text-sm font-medium text-[#BA7517] hover:bg-[#FFF7ED]"
            >
              New Chat
            </button>

            <Link
              href="/history"
              className="rounded-xl border border-[#7B2FBE] px-4 py-2 text-sm font-medium text-[#7B2FBE] hover:bg-[#EEEDFE]"
            >
              History
            </Link>

            {sessionId && (
              <Link
                href={`/report?session=${sessionId}`}
                className="rounded-xl bg-[#BA7517] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                View Report
              </Link>
            )}

            <button
              onClick={() => {
                localStorage.removeItem("access_token");
                localStorage.removeItem("user_id");
                localStorage.removeItem("username");
                localStorage.removeItem("session_id");
                window.location.href = "/login";
              }}
              className="rounded-xl bg-[#7B2FBE] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Logout
            </button>
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

            {(isLoading || isSessionLoading) && (
              <div className="px-4 py-2 text-sm italic text-[#7B2FBE]">
                {isSessionLoading ? "Loading conversation..." : "AEGIS is thinking..."}
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