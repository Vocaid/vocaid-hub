'use client';
import { MiniKit } from '@worldcoin/minikit-js';
import { MiniKitProvider } from '@worldcoin/minikit-js/minikit-provider';
import { Session } from 'next-auth';
import { SessionProvider } from 'next-auth/react';
import dynamic from 'next/dynamic';
import { type ReactNode } from 'react';

// Fix P-064: MiniKit v2.0.2 defines `commands` as a static getter that throws.
// @worldcoin/mini-apps-ui-kit-react v1.6.0 accesses MiniKit.commands.sendHapticFeedback().
// Although haptics.js wraps the call in try/catch, the thrown error still surfaces in
// some environments. Override the getter at module level (before any component renders)
// so it returns a safe stub instead of throwing.
try {
  Object.defineProperty(MiniKit, 'commands', {
    get() {
      return { sendHapticFeedback: () => {} };
    },
    configurable: true,
  });
} catch {
  // MiniKit may not have the getter in future versions — safe to ignore
}

const ErudaProvider = dynamic(
  () => import('@/providers/Eruda').then((c) => c.ErudaProvider),
  { ssr: false },
);

interface ClientProvidersProps {
  children: ReactNode;
  session: Session | null;
}

export default function ClientProviders({
  children,
  session,
}: ClientProvidersProps) {
  return (
    <ErudaProvider>
      <MiniKitProvider props={{ appId: process.env.NEXT_PUBLIC_APP_ID }}>
        <SessionProvider session={session}>{children}</SessionProvider>
      </MiniKitProvider>
    </ErudaProvider>
  );
}
