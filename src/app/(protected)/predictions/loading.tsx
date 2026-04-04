import { Page } from '@/components/PageLayout';

function PredictionSkeleton() {
  return (
    <div className="rounded-xl border border-border-card bg-surface p-4 flex flex-col gap-3 animate-pulse shadow-sm">
      {/* Header: icon + question */}
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-border-card shrink-0" />
        <div className="flex-1 flex flex-col gap-1.5">
          <div className="h-4 w-full rounded bg-border-card" />
          <div className="h-4 w-2/3 rounded bg-border-card" />
        </div>
      </div>
      {/* Pool bar */}
      <div className="h-3 rounded-full bg-border-card" />
      {/* Meta row */}
      <div className="flex items-center justify-between">
        <div className="h-3 w-28 rounded bg-border-card" />
        <div className="h-3 w-20 rounded bg-border-card" />
      </div>
      {/* YES / NO buttons */}
      <div className="flex gap-2">
        <div className="flex-1 h-11 rounded-lg bg-border-card" />
        <div className="flex-1 h-11 rounded-lg bg-border-card" />
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <>
      <Page.Header className="p-0">
        <div className="flex items-center px-4 py-3">
          <div className="h-6 w-40 rounded bg-border-card animate-pulse" />
        </div>
      </Page.Header>
      <Page.Main className="flex flex-col items-stretch gap-4 mb-16 px-4">
        <div className="flex flex-col gap-4 stagger-children">
          <PredictionSkeleton />
          <PredictionSkeleton />
          <PredictionSkeleton />
        </div>
      </Page.Main>
    </>
  );
}
