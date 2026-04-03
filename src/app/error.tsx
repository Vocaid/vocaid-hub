'use client';

import { AlertTriangle } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6">
      <AlertTriangle className="w-12 h-12 text-status-failed" />
      <h1 className="text-xl font-bold text-primary">Something went wrong</h1>
      <p className="text-sm text-secondary text-center max-w-[300px]">
        {error.message || 'An unexpected error occurred. Please try again.'}
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 rounded-lg bg-primary-accent text-white text-sm font-medium"
      >
        Try again
      </button>
    </div>
  );
}
