'use client';
import { MiniKitProvider } from '@worldcoin/minikit-js/minikit-provider';
import { Session } from 'next-auth';
import { SessionProvider } from 'next-auth/react';
import dynamic from 'next/dynamic';
import { type ReactNode, useEffect } from 'react';

const ErudaProvider = dynamic(
  () => import('@/providers/Eruda').then((c) => c.ErudaProvider),
  { ssr: false },
);

// Define props for ClientProviders
interface ClientProvidersProps {
  children: ReactNode;
  session: Session | null; // Use the appropriate type for session from next-auth
}

/**
 * ClientProvider wraps the app with essential context providers.
 *
 * - ErudaProvider:
 *     - Should be used only in development.
 *     - Enables an in-browser console for logging and debugging.
 *
 * - MiniKitProvider:
 *     - Required for MiniKit functionality.
 *
 * This component ensures both providers are available to all child components.
 */
export default function ClientProviders({
  children,
  session,
}: ClientProvidersProps) {
  // Shim: MiniKit v2 removed .commands but UI kit v1.6.0 still accesses it for haptics
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mk = (window as any).MiniKit;
    if (mk && !mk.commands) {
      mk.commands = { sendHapticFeedback: () => {} };
    }
  }, []);

  return (
    <ErudaProvider>
      <MiniKitProvider props={{ appId: process.env.NEXT_PUBLIC_APP_ID }}>
        <SessionProvider session={session}>{children}</SessionProvider>
      </MiniKitProvider>
    </ErudaProvider>
  );
}
