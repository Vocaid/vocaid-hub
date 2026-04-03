import { Page } from '@/components/PageLayout';

export default function Loading() {
  return (
    <Page>
      <Page.Header className="flex-row items-center gap-2">
        <div className="h-8 w-8 rounded-full bg-border-card animate-pulse" />
        <div className="h-6 w-36 rounded bg-border-card animate-pulse" />
      </Page.Header>
      <Page.Main className="flex flex-col gap-6 px-4 py-6">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex items-start gap-4 animate-pulse">
            <div className="h-10 w-10 rounded-full bg-border-card flex-shrink-0" />
            <div className="flex-1 flex flex-col gap-2">
              <div className="h-5 w-32 rounded bg-border-card" />
              <div className="h-4 w-48 rounded bg-border-card" />
            </div>
          </div>
        ))}
      </Page.Main>
    </Page>
  );
}
