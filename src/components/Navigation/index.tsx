'use client';

import { TabItem, Tabs } from '@worldcoin/mini-apps-ui-kit-react';
import { Store, Cpu, TrendingUp, User, Eye } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

const tabs = [
  { value: '/home', icon: <Store className="w-5 h-5" />, label: 'Market' },
  { value: '/gpu-verify', icon: <Cpu className="w-5 h-5" />, label: 'GPU' },
  { value: '/predictions', icon: <TrendingUp className="w-5 h-5" />, label: 'Predict' },
  { value: '/agent-decision', icon: <Eye className="w-5 h-5" />, label: 'Seer' },
  { value: '/profile', icon: <User className="w-5 h-5" />, label: 'Profile' },
] as const;

export const Navigation = () => {
  const pathname = usePathname();
  const router = useRouter();

  // Match current route to tab value
  const activeTab = tabs.find((t) => pathname.startsWith(t.value))?.value ?? '/home';

  return (
    <Tabs value={activeTab} onValueChange={(val) => router.push(val)}>
      {tabs.map((tab) => (
        <TabItem key={tab.value} value={tab.value} icon={tab.icon} label={tab.label} />
      ))}
    </Tabs>
  );
};
