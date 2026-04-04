'use client';

import Image from 'next/image';

export type Chain = 'world' | '0g' | 'hedera';

const chainConfig: Record<Chain, { logo: string; alt: string }> = {
  world: { logo: '/world.png', alt: 'World' },
  '0g': { logo: '/0G.png', alt: '0G' },
  hedera: { logo: '/hedera.png', alt: 'Hedera' },
};

export function ChainBadge({ chain }: { chain: Chain }) {
  const { logo, alt } = chainConfig[chain];
  return (
    <Image src={logo} alt={alt} width={28} height={28} className="inline-block shrink-0" />
  );
}
