import { ResourceCardSkeleton } from '@/components/ResourceCardSkeleton';
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
        <div className="flex gap-2 py-2">
          {['All', 'GPU', 'Agent', 'Human'].map((t) => (
            <div key={t} className="h-8 w-16 rounded-full bg-border-card animate-pulse" />
          ))}
        </div>
        <div className="flex flex-col gap-3 stagger-children">
          <ResourceCardSkeleton />
          <ResourceCardSkeleton />
          <ResourceCardSkeleton />
        </div>
      </Page.Main>
    </>
  );
}
