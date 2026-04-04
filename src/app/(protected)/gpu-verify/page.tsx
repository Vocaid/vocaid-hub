import GPUVerifyTabs from './GPUVerifyTabs';

export const metadata = {
  title: 'Resources — Vocaid Hub',
  description:
    'Browse, verify, and register resources on ERC-8004 — GPU compute, AI agents, human skills, physical infrastructure',
};

export default function GPUVerifyPage() {
  return (
    <div className="flex flex-col items-stretch gap-4 mb-16 px-4 pt-2">
      <GPUVerifyTabs />
    </div>
  );
}
