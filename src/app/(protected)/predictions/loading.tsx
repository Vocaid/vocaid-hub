import { Page } from '@/components/PageLayout';

function PredictionCardSkeleton() {
  return (
    <div className="rounded-xl border border-border-card bg-surface p-4 flex flex-col gap-3 animate-pulse">
      <div className="flex items-start gap-2.5">
        <div className="w-9 h-9 rounded-lg bg-border-card shrink-0" />
        <div className="w-48 h-4 rounded bg-border-card mt-1" />
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="h-3 rounded-full bg-border-card" />
        <div className="h-3 rounded-full bg-border-card" />
      </div>
      <div className="flex items-center justify-between">
        <div className="w-20 h-3 rounded bg-border-card" />
        <div className="w-24 h-3 rounded bg-border-card" />
      </div>
    </div>
  );
}

export default function PredictionsLoading() {
  return (
    <>
      <Page.Header className="p-0">
        <div className="h-12 flex items-center px-4">
          <div className="w-36 h-5 rounded bg-border-card animate-pulse" />
        </div>
      </Page.Header>
      <Page.Main className="flex flex-col items-stretch gap-4 mb-16 px-4">
        <PredictionCardSkeleton />
        <PredictionCardSkeleton />
        <PredictionCardSkeleton />
      </Page.Main>
    </>
  );
}
