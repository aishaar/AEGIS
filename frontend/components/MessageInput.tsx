type MessageInputProps = {
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
};

export default function MessageInput({
  input,
  onInputChange,
  onSend,
}: MessageInputProps) {
  return (
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
  );
}