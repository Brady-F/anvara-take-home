'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { api, getCampaigns } from '@/lib/api';
import type { RoleData } from '@/lib/auth-helpers';
import { mutate } from '../mutation';
import { textField, validMoney, validDate, type FormState } from '../form-state';

function campaignData(form: FormData, partialDates = false) {
  const name = textField(form, 'name');
  const description = textField(form, 'description');
  const budget = textField(form, 'budget');
  const startDate =
    partialDates && !form.has('startDate') ? undefined : textField(form, 'startDate');
  const endDate = partialDates && !form.has('endDate') ? undefined : textField(form, 'endDate');
  const status = textField(form, 'status');
  const fieldErrors: Record<string, string> = {};
  if (!name || name.includes('\u0000')) fieldErrors.name = 'Enter a name.';
  if (description.includes('\u0000')) fieldErrors.description = 'Remove null characters.';
  if (!validMoney(budget))
    fieldErrors.budget = 'Enter a positive budget up to 99,999,999.99 with at most 2 decimals.';
  if (startDate !== undefined && !validDate(startDate))
    fieldErrors.startDate = 'Enter a valid start date.';
  if (endDate !== undefined && !validDate(endDate)) fieldErrors.endDate = 'Enter a valid end date.';
  if (
    startDate &&
    endDate &&
    !fieldErrors.startDate &&
    !fieldErrors.endDate &&
    endDate <= startDate
  ) {
    fieldErrors.endDate = 'End date must be after start date.';
  }
  if (
    !['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'].includes(
      status
    )
  ) {
    fieldErrors.status = 'Select a valid status.';
  }
  return {
    fieldErrors,
    data: {
      name,
      description: description || null,
      budget: Number(budget),
      startDate,
      endDate,
      status,
    },
  };
}

export async function createCampaign(_previous: FormState, form: FormData): Promise<FormState> {
  const { fieldErrors, data } = campaignData(form);
  if (Object.keys(fieldErrors).length) return { fieldErrors };
  return mutate('campaigns', 'POST', data);
}

export async function updateCampaign(
  id: string,
  _previous: FormState,
  form: FormData
): Promise<FormState> {
  const { fieldErrors, data } = campaignData(form, true);
  if (Object.keys(fieldErrors).length) return { fieldErrors };
  return mutate('campaigns', 'PUT', data, id);
}

export async function deleteCampaign(
  id: string,
  _previous: FormState,
  _form: FormData
): Promise<FormState> {
  return mutate('campaigns', 'DELETE', undefined, id);
}

export async function getSponsorCampaigns() {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session?.user) {
    redirect('/login');
  }

  // Let backend failures reach the error boundary instead of treating them as a missing role.
  const roleData = await api<RoleData>(`/api/auth/role/${session.user.id}`, {
    headers: { cookie: requestHeaders.get('cookie') || '' },
    cache: 'no-store',
  });
  if (roleData.role !== 'sponsor') {
    redirect('/');
  }
  if (!roleData.sponsorId) {
    throw new Error('Sponsor profile is missing');
  }

  return getCampaigns(roleData.sponsorId, {
    headers: { cookie: requestHeaders.get('cookie') || '' },
  });
}
