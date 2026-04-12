type ReflectionCardProps = {
  prompt: string;
};

export default function ReflectionCard({
  prompt,
}: ReflectionCardProps) {
  return (
    <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-[#7B2FBE]">Reflection</p>
      <p className="mt-2 text-sm text-[#444441]">{prompt}</p>
      <div className="mt-4 flex gap-3">
        <button className="rounded-xl bg-[#7B2FBE] px-4 py-2 text-sm font-medium text-white hover:opacity-90">
          I engaged with this
        </button>
        <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-[#444441] hover:bg-gray-50">
          Skip
        </button>
      </div>
    </div>
  );
}