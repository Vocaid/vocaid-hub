'use client';

import { Page } from '@/components/PageLayout';
import { AlertTriangle, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Page>
      <Page.Header className="flex-row items-center gap-2">
        <Link
          href="/"
          className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-surface"
        >
          <ChevronLeft className="h-5 w-5 text-primary" />
        </Link>
        <h2 className="text-lg font-semibold text-primary">
          GPU Verification
        </h2>
      </Page.Header>
      <Page.Main className="flex flex-col items-center justify-center gap-4 px-4">
        <AlertTriangle className="w-12 h-12 text-status-failed" />
        <h2 className="text-lg font-semibold text-primary">Verification failed</h2>
        <p className="text-sm text-secondary text-center">
          {error.message || 'Something went wrong during GPU verification.'}
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 rounded-lg bg-primary-accent text-white text-sm font-medium"
        >
          Try again
        </button>
      </Page.Main>
    </Page>
  );
}
