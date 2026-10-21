import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getUserRole } from '@/lib/auth-helpers';
import { AdSlotList } from './components/ad-slot-list';

export default async function PublisherDashboard() {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({
    headers: requestHeaders,
  });

  if (!session?.user) {
    redirect('/login');
  }

  // Verify user has 'publisher' role
  const roleData = await getUserRole(session.user.id, {
    headers: { cookie: requestHeaders.get('cookie') || '' },
  });
  if (roleData.role !== 'publisher') {
    redirect('/');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Ad Slots</h1>
        {/* TODO: Add CreateAdSlotButton here */}
      </div>

      <AdSlotList />
    </div>
  );
}
