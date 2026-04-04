export function ReputationBar({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score));

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-2 rounded-full bg-border-card overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-chain-hedera to-primary-accent transition-all duration-500"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="text-xs font-medium text-secondary tabular-nums w-8 text-right">
        {clamped}
      </span>
    </div>
  );
}
