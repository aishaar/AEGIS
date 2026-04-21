type Message = {
  role: "user" | "assistant";
  content: string;
};

type MessageListProps = {
  messages: Message[];
};

function formatAssistantText(text: string): string[] {
  // If the backend already inserted \n\n breaks, use them directly
  if (text.includes("\n\n")) {
    return text.split("\n\n").map((s) => s.trim()).filter(Boolean);
  }

  // Fallback: split on sentence boundaries and group into logical chunks.
  // A chunk boundary is any sentence ending with . ! ? followed by a space.
  const raw = text.match(/[^.!?]+[.!?]+["']?\s*/g);
  if (!raw || raw.length <= 1) return [text];

  const sentences = raw.map((s) => s.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    const isQuestion = sentence.trimEnd().endsWith("?");

    if (isQuestion && current.trim()) {
      // Flush accumulated text, then push the question as its own chunk
      chunks.push(current.trim());
      chunks.push(sentence.trim());
      current = "";
    } else {
      current += (current ? " " : "") + sentence;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

export default function MessageList({ messages }: MessageListProps) {
  return (
    <div className="mb-4 flex-1 rounded-2xl bg-white p-4">
      {messages.length === 0 ? (
        <p className="text-sm text-gray-500">Chat messages will appear here.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {messages.map((message, index) => {
            if (message.role === "assistant") {
              const chunks = formatAssistantText(message.content);
              return (
                <div
                  key={index}
                  className="max-w-[70%] self-start rounded-2xl bg-[#EEEDFE] px-4 py-3 text-[#444441] flex flex-col gap-2"
                >
                  {chunks.map((chunk, i) => (
                    <p key={i} className={chunk.trimEnd().endsWith("?") ? "font-medium" : ""}>
                      {chunk}
                    </p>
                  ))}
                </div>
              );
            }

            return (
              <div
                key={index}
                className="max-w-[70%] self-end rounded-2xl bg-[#7B2FBE] px-4 py-3 text-white whitespace-pre-line"
              >
                {message.content}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
