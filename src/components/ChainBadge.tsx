'use client';

import Image from 'next/image';

export type { Chain } from '@/types/resource';
import type { Chain } from '@/types/resource';

const chainConfig: Record<Chain, { logo: string; alt: string }> = {
  world: { logo: '/world.png', alt: 'World' },
  '0g': { logo: '/0G.png', alt: '0G' },
  hedera: { logo: '/hedera.png', alt: 'Hedera' },
};

export function ChainBadge({ chain }: { chain: Chain }) {
  const { logo, alt } = chainConfig[chain];
  return (
    <Image src={logo} alt={alt} width={36} height={36} className="inline-block shrink-0" />
  );
}
