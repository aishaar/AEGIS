type Message = {
  role: "user" | "assistant";
  content: string;
};

type ChatWindowProps = {
  messages: Message[];
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
};

export default function ChatWindow({
  messages,
  input,
  onInputChange,
  onSend,
}: ChatWindowProps) {
  return (
    <>
      <div className="mb-4 flex-1 rounded-2xl bg-white p-4">
        <div className="flex flex-col gap-3">
          {messages.map((message, index) => (
            <div
              key={index}
              className={
                message.role === "user"
                  ? "max-w-[70%] self-end rounded-2xl bg-[#7B2FBE] px-4 py-3 text-white"
                  : "max-w-[70%] self-start rounded-2xl bg-[#EEEDFE] px-4 py-3 text-[#444441]"
              }
            >
              {message.content}
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Type your message..."
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onSend();
            }
          }}
          className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-[#7B2FBE]"
        />
        <button
          onClick={onSend}
          className="rounded-xl bg-[#7B2FBE] px-5 py-3 font-medium text-white hover:opacity-90"
        >
          Send
        </button>
      </div>
    </>
  );
}