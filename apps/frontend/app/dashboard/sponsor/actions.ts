'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { api, getCampaigns } from '@/lib/api';
import type { RoleData } from '@/lib/auth-helpers';

export async function getSponsorCampaigns() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect('/login');
  }

  // Let backend failures reach the error boundary instead of treating them as a missing role.
  const roleData = await api<RoleData>(`/api/auth/role/${session.user.id}`, {
    cache: 'no-store',
  });
  if (roleData.role !== 'sponsor') {
    redirect('/');
  }
  if (!roleData.sponsorId) {
    throw new Error('Sponsor profile is missing');
  }

  return getCampaigns(roleData.sponsorId);
}
