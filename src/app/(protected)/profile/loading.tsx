import { Page } from '@/components/PageLayout';

export default function ProfileLoading() {
  return (
    <>
      <Page.Header className="p-0">
        <div className="h-12 flex items-center px-4">
          <div className="w-28 h-5 rounded bg-border-card animate-pulse" />
        </div>
      </Page.Header>
      <Page.Main className="flex flex-col items-stretch gap-4 mb-16 px-4">
        {/* Profile header skeleton */}
        <div className="rounded-xl border border-border-card bg-surface p-4 flex items-center gap-3 animate-pulse">
          <div className="w-12 h-12 rounded-full bg-border-card" />
          <div className="flex flex-col gap-1.5">
            <div className="w-28 h-4 rounded bg-border-card" />
            <div className="w-36 h-3 rounded bg-border-card" />
          </div>
        </div>
        {/* Agent card skeletons */}
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border-card bg-surface p-4 flex flex-col gap-2 animate-pulse">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-border-card" />
              <div className="w-32 h-4 rounded bg-border-card" />
            </div>
            <div className="w-48 h-3 rounded bg-border-card" />
          </div>
        ))}
      </Page.Main>
    </>
  );
}
