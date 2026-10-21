import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { api, ApiError } from '@/lib/api';
import type { FormState } from './form-state';

// Every mutation checks its own session; Express enforces role and resource ownership.
export async function mutate(
  resource: 'campaigns' | 'ad-slots',
  method: 'POST' | 'PUT' | 'DELETE',
  data?: object,
  id?: string
): Promise<FormState> {
  try {
    const requestHeaders = await headers();
    const session = await auth.api.getSession({ headers: requestHeaders });
    if (!session?.user) return { error: 'Your session expired. Please sign in again.' };
    if (method !== 'POST' && (typeof id !== 'string' || !id.trim())) {
      return { error: 'The item ID is missing.' };
    }
    await api(`/api/${resource}${method === 'POST' ? '' : `/${encodeURIComponent(id!)}`}`, {
      method,
      headers: { cookie: requestHeaders.get('cookie') || '' },
      ...(data && { body: JSON.stringify(data) }),
    });
  } catch (error) {
    if (error instanceof ApiError && error.status < 500) {
      if (error.status === 401) return { error: 'Your session expired. Please sign in again.' };
      if (error.status === 403) return { error: 'You do not have permission to change this item.' };
      return { error: error.message };
    }
    return { error: 'Unable to save your changes. Please try again.' };
  }
  revalidatePath(resource === 'campaigns' ? '/dashboard/sponsor' : '/dashboard/publisher');
  return { success: true };
}
