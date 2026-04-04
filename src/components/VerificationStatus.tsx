import { ShieldCheck } from 'lucide-react';

export type { VerificationType } from '@/types/resource';
import type { VerificationType } from '@/types/resource';

const labels: Record<VerificationType, string> = {
  tee: 'TEE Verified',
  'world-id': 'World ID',
  agentkit: 'AgentKit',
};

export function VerificationStatus({
  verified,
  type = 'tee',
}: {
  verified: boolean;
  type?: VerificationType;
}) {
  if (!verified) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-status-inactive">
        <ShieldCheck className="w-3.5 h-3.5" />
        Unverified
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-status-verified">
      <ShieldCheck className="w-3.5 h-3.5" />
      {labels[type]}
    </span>
  );
}
