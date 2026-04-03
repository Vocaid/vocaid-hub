import { Page } from '@/components/PageLayout';

export default function Loading() {
  return (
    <>
      <Page.Header className="p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="h-6 w-28 rounded bg-border-card animate-pulse" />
          <div className="h-10 w-10 rounded-full bg-border-card animate-pulse" />
        </div>
      </Page.Header>
      <Page.Main className="flex flex-col items-stretch gap-4 mb-16 px-4">
        <div className="rounded-xl border border-border-card bg-surface p-5 flex flex-col gap-3 animate-pulse">
          <div className="h-5 w-32 rounded bg-border-card" />
          <div className="h-4 w-48 rounded bg-border-card" />
          <div className="h-4 w-24 rounded bg-border-card" />
        </div>
        <div className="h-5 w-28 rounded bg-border-card animate-pulse" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border border-border-card bg-surface p-4 h-32 animate-pulse" />
          ))}
        </div>
      </Page.Main>
    </>
  );
}
