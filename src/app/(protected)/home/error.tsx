'use client';

import { Page } from '@/components/PageLayout';
import { AlertTriangle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <>
      <Page.Header className="p-0">
        <div className="px-4 py-3">
          <img src="/app-logo.png" alt="Vocaid Hub" className="h-6" />
        </div>
      </Page.Header>
      <Page.Main className="flex flex-col items-center justify-center gap-4 px-4">
        <AlertTriangle className="w-12 h-12 text-status-failed" />
        <h2 className="text-lg font-semibold text-primary">Failed to load marketplace</h2>
        <p className="text-sm text-secondary text-center">
          {error.message || 'Something went wrong loading resources.'}
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 rounded-lg bg-primary-accent text-white text-sm font-medium"
        >
          Try again
        </button>
      </Page.Main>
    </>
  );
}
