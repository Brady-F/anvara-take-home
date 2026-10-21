'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { api, getAdSlots } from '@/lib/api';
import type { RoleData } from '@/lib/auth-helpers';
import { mutate } from '../mutation';
import { textField, validMoney, type FormState } from '../form-state';

export async function getPublisherAdSlots() {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session?.user) redirect('/login');
  const options = { headers: { cookie: requestHeaders.get('cookie') || '' } };
  const role = await api<RoleData>(`/api/auth/role/${session.user.id}`, options);
  if (role.role !== 'publisher') redirect('/');
  if (!role.publisherId) throw new Error('Publisher profile is missing');
  return getAdSlots(role.publisherId, options);
}

function adSlotData(form: FormData) {
  const name = textField(form, 'name');
  const description = textField(form, 'description');
  const type = textField(form, 'type');
  const basePrice = textField(form, 'basePrice');
  const isAvailable = textField(form, 'isAvailable');
  const fieldErrors: Record<string, string> = {};
  if (!name || name.includes('\u0000')) fieldErrors.name = 'Enter a name.';
  if (description.includes('\u0000')) fieldErrors.description = 'Remove null characters.';
  if (!['DISPLAY', 'VIDEO', 'NATIVE', 'NEWSLETTER', 'PODCAST'].includes(type))
    fieldErrors.type = 'Select a valid type.';
  if (!validMoney(basePrice))
    fieldErrors.basePrice = 'Enter a positive price up to 99,999,999.99 with at most 2 decimals.';
  if (!['true', 'false'].includes(isAvailable)) fieldErrors.isAvailable = 'Select availability.';
  return {
    fieldErrors,
    data: {
      name,
      description: description || null,
      type,
      basePrice: Number(basePrice),
      isAvailable: isAvailable === 'true',
    },
  };
}

export async function createAdSlot(_previous: FormState, form: FormData): Promise<FormState> {
  const { fieldErrors, data } = adSlotData(form);
  if (Object.keys(fieldErrors).length) return { fieldErrors };
  return mutate('ad-slots', 'POST', data);
}

export async function updateAdSlot(
  id: string,
  _previous: FormState,
  form: FormData
): Promise<FormState> {
  const { fieldErrors, data } = adSlotData(form);
  if (Object.keys(fieldErrors).length) return { fieldErrors };
  return mutate('ad-slots', 'PUT', data, id);
}

export async function deleteAdSlot(
  id: string,
  _previous: FormState,
  _form: FormData
): Promise<FormState> {
  return mutate('ad-slots', 'DELETE', undefined, id);
}
