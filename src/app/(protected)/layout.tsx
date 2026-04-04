import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { Page } from '@/components/PageLayout';
import { TopBar, Marble } from '@worldcoin/mini-apps-ui-kit-react';
import Image from 'next/image';

export default async function TabsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect('/');

  return (
    <Page>
      <Page.Header className="p-0">
        <TopBar
          startAdornment={
            <Image
              src="/app-logo.png"
              alt="Vocaid Hub"
              width={120}
              height={24}
              className="h-6 w-auto max-w-[120px] object-contain"
              priority
            />
          }
          endAdornment={
            <div className="flex items-center gap-2 shrink-0">
              <p className="text-sm font-semibold capitalize truncate max-w-[100px]">
                {session?.user.username}
              </p>
              <Marble src={session?.user.profilePictureUrl} className="w-10" />
            </div>
          }
        />
      </Page.Header>
      {children}
      <Page.Footer className="px-0 fixed bottom-0 w-full bg-white z-50">
        <Navigation />
      </Page.Footer>
    </Page>
  );
}
