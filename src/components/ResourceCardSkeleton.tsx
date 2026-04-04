export function ResourceCardSkeleton() {
  return (
    <div className="rounded-xl border border-border-card bg-surface p-4 flex flex-col gap-3 animate-pulse shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-border-card" />
          <div className="flex flex-col gap-1.5">
            <div className="w-24 h-4 rounded bg-border-card" />
            <div className="w-16 h-3 rounded bg-border-card" />
          </div>
        </div>
        <div className="w-14 h-5 rounded-full bg-border-card" />
      </div>
      <div className="h-2 rounded-full bg-border-card" />
      <div className="flex items-center justify-between">
        <div className="w-28 h-4 rounded bg-border-card" />
        <div className="w-24 h-10 rounded-lg bg-border-card" />
      </div>
    </div>
  );
}
