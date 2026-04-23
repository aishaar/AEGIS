"use client";

export type SimMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  route?: string;
  stage?: string;
  engagement?: string;
  passivity_alert?: boolean;
};

type Props = { message: SimMessage };

const ROUTE_BADGE: Record<string, string> = {
  challenge:   "bg-[#FEE2E2] text-[#991B1B]",
  reflection:  "bg-[#EDE9FE] text-[#5B21B6]",
  scaffolding: "bg-[#D1FAE5] text-[#065F46]",
  direct:      "bg-[#FEF9C3] text-[#713F12]",
  welcome:     "bg-[#DBEAFE] text-[#1E40AF]",
};

const ENGAGEMENT_BADGE: Record<string, string> = {
  high:    "bg-[#D1FAE5] text-[#065F46]",
  medium:  "bg-[#FEF3C7] text-[#92400E]",
  low:     "bg-[#FEE2E2] text-[#991B1B]",
  unknown: "bg-[#F3F4F6] text-[#6B7280]",
};

export default function SimulationMessage({ message }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
      <div
        className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-[#EDE9FE] text-[#374151]"
            : "bg-[#F0FFF4] text-[#374151] border border-[#BBF7D0]"
        }`}
      >
        {message.content}
      </div>

      {!isUser && message.route && (
        <div className="flex flex-wrap gap-1 mt-1 pl-1">
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              ROUTE_BADGE[message.route] ?? "bg-[#F3F4F6] text-[#6B7280]"
            }`}
          >
            {message.route}
          </span>

          {message.stage && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280]">
              {message.stage}
            </span>
          )}

          {message.engagement && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                ENGAGEMENT_BADGE[message.engagement] ?? ENGAGEMENT_BADGE.unknown
              }`}
            >
              {message.engagement} engagement
            </span>
          )}

          {message.passivity_alert && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#FEE2E2] text-[#991B1B] font-medium">
              ⚠ passivity alert
            </span>
          )}
        </div>
      )}
    </div>
  );
}
