type ChallengeBannerProps = {
  prompt: string;
};

export default function ChallengeBanner({
  prompt,
}: ChallengeBannerProps) {
  return (
    <div className="mb-4 rounded-2xl border border-[#BA7517]/20 bg-amber-50 px-4 py-3 text-[#BA7517] shadow-sm">
      <p className="text-sm font-semibold">Challenge prompt</p>
      <p className="mt-1 text-sm">{prompt}</p>
    </div>
  );
}