export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3 animate-pulse">
        <div className="h-8 w-40 rounded bg-border-card" />
        <div className="h-4 w-56 rounded bg-border-card" />
      </div>
    </div>
  );
}
