import { Page } from '@/components/PageLayout';
import { ResourceCardSkeleton } from '@/components/ResourceCardSkeleton';

export default function HomeLoading() {
  return (
    <>
      <Page.Header className="p-0">
        <div className="h-12 flex items-center px-4">
          <div className="w-24 h-5 rounded bg-border-card animate-pulse" />
        </div>
      </Page.Header>
      <Page.Main className="flex flex-col items-stretch gap-4 mb-16 px-4">
        {/* Filter tab skeleton */}
        <div className="flex gap-1 p-1 rounded-lg bg-surface border border-border-card">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex-1 h-[44px] rounded-md bg-border-card animate-pulse" />
          ))}
        </div>
        {/* Resource card skeletons */}
        <div className="flex flex-col gap-3">
          <ResourceCardSkeleton />
          <ResourceCardSkeleton />
          <ResourceCardSkeleton />
          <ResourceCardSkeleton />
        </div>
      </Page.Main>
    </>
  );
}
