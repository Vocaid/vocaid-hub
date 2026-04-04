export default function Loading() {
  return (
    <div className="flex flex-col gap-4 px-4 pt-2 mb-16">
      {/* Tab switcher skeleton */}
      <div className="h-10 rounded-lg bg-border-card animate-pulse" />

      {/* Filter pills skeleton */}
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-7 w-14 rounded-full bg-border-card animate-pulse" />
        ))}
      </div>

      {/* Resource cards skeleton */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-28 rounded-xl bg-border-card animate-pulse" />
      ))}
    </div>
  );
}
