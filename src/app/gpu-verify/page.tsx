import { Page } from '@/components/PageLayout';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import GPUVerifyTabs from './GPUVerifyTabs';

export const metadata = {
  title: 'Resources — Vocaid Hub',
  description:
    'Browse resource reputation signals and register GPU providers on ERC-8004',
};

export default function GPUVerifyPage() {
  return (
    <Page>
      <Page.Header className="flex-row items-center gap-2">
        <Link
          href="/"
          className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-surface"
        >
          <ChevronLeft className="h-5 w-5 text-primary" />
        </Link>
        <h2 className="text-lg font-semibold text-primary">Resources</h2>
      </Page.Header>
      <Page.Main>
        <GPUVerifyTabs />
      </Page.Main>
    </Page>
  );
}
