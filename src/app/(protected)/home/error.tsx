'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Page } from '@/components/PageLayout';

export default function HomeError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { reset } = props;
  return (
    <>
      <Page.Header className="p-0">
        <div className="h-12 flex items-center px-4">
          <span className="text-base font-semibold text-primary">Vocaid Hub</span>
        </div>
      </Page.Header>
      <Page.Main className="flex flex-col items-center justify-center gap-4 px-4 py-16">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-status-failed/10">
          <AlertTriangle className="w-6 h-6 text-status-failed" />
        </div>
        <div className="text-center">
          <h2 className="text-base font-semibold text-primary">Failed to load marketplace</h2>
          <p className="text-sm text-secondary mt-1">
            Could not fetch resources from the network.
          </p>
        </div>
        <button
          onClick={reset}
          className="min-h-[44px] min-w-[44px] flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary-accent text-white text-sm font-semibold active:scale-95 transition-transform"
        >
          <RefreshCw className="w-4 h-4" />
          Try again
        </button>
      </Page.Main>
    </>
  );
}
