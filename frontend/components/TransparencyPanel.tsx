type TransparencyPanelProps = {
  explanation: string;
  confidenceBand: "low" | "medium" | "high";
  whatToVerify: string;
  uncertaintyFlag: boolean;
};

export default function TransparencyPanel({
  explanation,
  confidenceBand,
  whatToVerify,
  uncertaintyFlag,
}: TransparencyPanelProps) {
  const confidenceBadgeClass =
    confidenceBand === "high"
      ? "bg-green-100 text-green-700"
      : confidenceBand === "medium"
      ? "bg-amber-100 text-amber-700"
      : "bg-red-100 text-red-700";

  return (
    <aside className="w-80 rounded-2xl bg-[#EEEDFE] p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-[#7B2FBE]">Transparency</h2>

      <div className="mt-4 rounded-2xl bg-white p-4">
        <p className="text-sm font-semibold text-[#444441]">Why this answer</p>
        <p className="mt-2 text-sm text-gray-600">{explanation}</p>
      </div>

      <div className="mt-4 rounded-2xl bg-white p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-[#444441]">Confidence</p>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${confidenceBadgeClass}`}
          >
            {confidenceBand}
          </span>
        </div>

        {uncertaintyFlag && (
          <p className="mt-3 text-xs text-amber-700">
            Warning: some uncertainty is present in this response.
          </p>
        )}
      </div>

      <div className="mt-4 rounded-2xl bg-white p-4">
        <p className="text-sm font-semibold text-[#444441]">What to check</p>
        <p className="mt-2 text-sm text-gray-600">{whatToVerify}</p>
      </div>
    </aside>
  );
}