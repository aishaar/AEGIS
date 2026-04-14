type Message = {
  role: "user" | "assistant";
  content: string;
};

type MessageListProps = {
  messages: Message[];
};

export default function MessageList({ messages }: MessageListProps) {
  return (
    <div className="mb-4 flex-1 rounded-2xl bg-white p-4">
      {messages.length === 0 ? (
        <p className="text-sm text-gray-500">Chat messages will appear here.</p>
      ) : (
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
      )}
    </div>
  );
}