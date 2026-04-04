import { Page } from '@/components/PageLayout';

function IdentitySkeleton() {
  return (
    <div className="rounded-xl border border-border-card bg-surface p-4 flex flex-col gap-3 animate-pulse shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-border-card" />
        <div className="flex flex-col gap-1.5">
          <div className="h-4 w-24 rounded bg-border-card" />
          <div className="h-3 w-32 rounded bg-border-card" />
        </div>
      </div>
      <div className="flex gap-2">
        <div className="h-6 w-32 rounded-full bg-border-card" />
        <div className="h-6 w-20 rounded-full bg-border-card" />
      </div>
    </div>
  );
}

function AgentSkeleton() {
  return (
    <div className="rounded-xl border border-border-card bg-surface p-4 flex flex-col gap-2.5 animate-pulse shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-border-card" />
          <div className="flex flex-col gap-1">
            <div className="h-4 w-16 rounded bg-border-card" />
            <div className="h-3 w-24 rounded bg-border-card" />
          </div>
        </div>
        <div className="h-5 w-10 rounded-full bg-border-card" />
      </div>
      <div className="flex gap-2">
        <div className="h-5 w-20 rounded-full bg-border-card" />
        <div className="h-5 w-16 rounded-full bg-border-card" />
      </div>
    </div>
  );
}

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
        <IdentitySkeleton />

        <div className="flex items-center justify-between">
          <div className="h-5 w-28 rounded bg-border-card animate-pulse" />
          <div className="h-4 w-16 rounded bg-border-card animate-pulse" />
        </div>

        <div className="flex flex-col gap-3 stagger-children">
          <AgentSkeleton />
          <AgentSkeleton />
          <AgentSkeleton />
          <AgentSkeleton />
        </div>

        <div className="h-11 w-full rounded-lg bg-border-card animate-pulse" />
      </Page.Main>
    </>
  );
}
