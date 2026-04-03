import { Page } from '@/components/PageLayout';

function PredictionSkeleton() {
  return (
    <div className="rounded-xl border border-border-card bg-surface p-4 flex flex-col gap-3 animate-pulse">
      <div className="h-5 w-3/4 rounded bg-border-card" />
      <div className="flex gap-2">
        <div className="h-8 flex-1 rounded-lg bg-border-card" />
        <div className="h-8 flex-1 rounded-lg bg-border-card" />
      </div>
      <div className="h-3 w-1/3 rounded bg-border-card" />
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
        <div className="flex flex-col gap-3 stagger-children">
          <PredictionSkeleton />
          <PredictionSkeleton />
          <PredictionSkeleton />
        </div>
      </Page.Main>
    </>
  );
}
