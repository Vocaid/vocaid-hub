import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { Page } from '@/components/PageLayout';
import { TopBar, Marble } from '@worldcoin/mini-apps-ui-kit-react';

export default async function TabsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect('/');

  return (
    <Page>
      <Page.Header className="p-0">
        <TopBar
          startAdornment={
            <img src="/app-logo.png" alt="Vocaid Hub" className="h-6 w-auto" />
          }
          endAdornment={
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold capitalize">
                {session?.user.username}
              </p>
              <Marble src={session?.user.profilePictureUrl} className="w-12" />
            </div>
          }
        />
      </Page.Header>
      {children}
      <Page.Footer className="px-0 fixed bottom-0 w-full bg-white">
        <Navigation />
      </Page.Footer>
    </Page>
  );
}
