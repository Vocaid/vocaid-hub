import { auth } from '@/auth';
import { Page } from '@/components/PageLayout';
import { ProfileContent } from './profile-content';

export const metadata = {
  title: 'Profile — Vocaid Hub',
};

export default async function ProfilePage() {
  const session = await auth();

  return (
    <Page.Main className="flex flex-col items-stretch gap-4 mb-16 px-4 pt-2">
      <ProfileContent
        username={session?.user.username ?? 'Anonymous'}
        walletAddress={session?.user.walletAddress}
      />
    </Page.Main>
  );
}
