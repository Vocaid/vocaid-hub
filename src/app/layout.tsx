import { auth } from '@/auth';
import ClientProviders from '@/providers';
import '@worldcoin/mini-apps-ui-kit-react/styles.css';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://vocaid-hub.vercel.app'),
  title: 'Vocaid Hub — Reliable Resources for the Agentic Economy',
  description:
    'Discover, verify, and trade any resource — human skills, GPU compute, AI agents — across World, 0G, and Hedera.',
  icons: {
    icon: '/compact-logo.png',
    apple: '/compact-logo.png',
  },
  openGraph: {
    title: 'Vocaid Hub — Reliable Resources for the Agentic Economy',
    description:
      'A protocol where verified humans and AI agents discover, verify, price, and trade ANY resource through ERC-8004 on 0G, x402 USDC on Hedera, and World ID.',
    images: [{ url: '/app-logo.png', width: 1200, height: 378, alt: 'Vocaid Hub — Hybrid Resource Allocation' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vocaid Hub — Reliable Resources for the Agentic Economy',
    description:
      'GPU compute, human skills, AI agents — all verified on-chain. Built at ETHGlobal Cannes 2026.',
    images: ['/app-logo.png'],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} `}>
        <ClientProviders session={session}>{children}</ClientProviders>
      </body>
    </html>
  );
}
