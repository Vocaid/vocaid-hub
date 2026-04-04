import { Page } from '@/components/PageLayout';
import GPUVerifyTabs from './GPUVerifyTabs';

export const metadata = {
  title: 'Resources — Vocaid Hub',
  description:
    'Browse resource reputation signals and register GPU providers on ERC-8004',
};

export default function GPUVerifyPage() {
  return (
    <Page.Main className="flex flex-col items-stretch gap-4 mb-16 px-4 pt-2">
      <h1 className="text-lg font-bold text-primary">Resources</h1>
      <GPUVerifyTabs />
    </Page.Main>
  );
}
