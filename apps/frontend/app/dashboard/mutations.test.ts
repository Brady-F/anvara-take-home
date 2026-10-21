import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import * as campaigns from './sponsor/actions';
import * as slots from './publisher/actions';
import type { FormAction } from './form-state';

vi.mock('@/auth', () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock('next/headers', () => ({ headers: async () => new Headers({ cookie: 'session=test' }) }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    throw new Error(`Redirect: ${path}`);
  },
}));
const fetchMock = vi.fn<typeof fetch>();
const getSession = vi.mocked(auth.api.getSession);
const campaign = {
  name: ' Launch ',
  description: '',
  budget: '123.45',
  startDate: '2026-10-21',
  endDate: '2026-10-22',
  status: 'DRAFT',
};
const slot = {
  name: ' Banner ',
  description: '',
  basePrice: '42.50',
  type: 'NATIVE',
  isAvailable: 'false',
};
function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}
const operations: [string, FormAction, string, string, Record<string, string>][] = [
  ['create campaign', campaigns.createCampaign, 'campaigns', 'POST', campaign],
  ['update campaign', campaigns.updateCampaign.bind(null, 'item/1'), 'campaigns', 'PUT', campaign],
  ['delete campaign', campaigns.deleteCampaign.bind(null, 'item/1'), 'campaigns', 'DELETE', {}],
  ['create slot', slots.createAdSlot, 'ad-slots', 'POST', slot],
  ['update slot', slots.updateAdSlot.bind(null, 'item/1'), 'ad-slots', 'PUT', slot],
  ['delete slot', slots.deleteAdSlot.bind(null, 'item/1'), 'ad-slots', 'DELETE', {}],
];
beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  getSession.mockResolvedValue({ user: { id: 'user-1' } } as Awaited<
    ReturnType<typeof auth.api.getSession>
  >);
});
afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllGlobals();
});

describe.each(operations)('%s', (_label, action, resource, method, values) => {
  it('forwards the cookie, uses the correct endpoint, and refreshes only after success', async () => {
    fetchMock.mockResolvedValue(
      method === 'DELETE' ? new Response(null, { status: 204 }) : Response.json({ id: 'item/1' })
    );
    await expect(
      action({}, form({ ...values, sponsorId: 'forged', publisherId: 'forged' }))
    ).resolves.toEqual({ success: true });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain(`/api/${resource}${method === 'POST' ? '' : '/item%2F1'}`);
    expect(options).toMatchObject({ method, cache: 'no-store', credentials: 'include' });
    expect(new Headers(options?.headers).get('cookie')).toBe('session=test');
    if (method !== 'DELETE') {
      const body = JSON.parse(String(options?.body));
      expect(body).not.toHaveProperty('sponsorId');
      expect(body).not.toHaveProperty('publisherId');
      expect(body.name).toBe(values.name.trim());
      expect(body.description).toBeNull();
      expect(body[resource === 'campaigns' ? 'budget' : 'basePrice']).toBe(
        Number(values[resource === 'campaigns' ? 'budget' : 'basePrice'])
      );
      if (resource === 'ad-slots') expect(body.isAvailable).toBe(false);
    }
    expect(revalidatePath).toHaveBeenCalledWith(
      resource === 'campaigns' ? '/dashboard/sponsor' : '/dashboard/publisher'
    );
    expect(revalidatePath).toHaveBeenCalledTimes(1);
  });
  it('rejects an expired session without a mutation or revalidation', async () => {
    getSession.mockResolvedValue(null);
    expect(await action({}, form(values))).toMatchObject({
      error: expect.stringContaining('sign in'),
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

it.each([401, 403, 404, 409, 500])(
  'handles backend %s without reporting success or refreshing',
  async (status) => {
    fetchMock.mockResolvedValue(
      Response.json(
        { error: status === 500 ? 'secret database details' : 'Item cannot be changed' },
        { status }
      )
    );
    const state = await campaigns.createCampaign({}, form(campaign));
    expect(state.error).toBeTruthy();
    expect(state.error).not.toContain('secret');
    expect(state.success).toBeUndefined();
    expect(revalidatePath).not.toHaveBeenCalled();
  }
);

it.each([
  ['blank name', { name: ' ' }, 'name'],
  ['null character', { description: '\u0000' }, 'description'],
  ['zero budget', { budget: '0' }, 'budget'],
  ['negative budget', { budget: '-1' }, 'budget'],
  ['oversized budget', { budget: '100000000' }, 'budget'],
  ['fractional cent', { budget: '1.001' }, 'budget'],
  ['invalid date', { startDate: '2026-02-30' }, 'startDate'],
  ['year zero', { startDate: '0000-01-01' }, 'startDate'],
  ['same dates', { endDate: campaign.startDate }, 'endDate'],
  ['reversed dates', { endDate: '2026-10-20' }, 'endDate'],
  ['invalid status', { status: 'invented' }, 'status'],
] as const)('validates campaign %s on create and update', async (_label, change, field) => {
  for (const action of [campaigns.createCampaign, campaigns.updateCampaign.bind(null, 'id')]) {
    expect((await action({}, form({ ...campaign, ...change }))).fieldErrors).toHaveProperty(field);
  }
  expect(fetchMock).not.toHaveBeenCalled();
  expect(revalidatePath).not.toHaveBeenCalled();
});
it.each([
  [{ name: '' }, 'name'],
  [{ type: 'invented' }, 'type'],
  [{ basePrice: 'NaN' }, 'basePrice'],
  [{ basePrice: '' }, 'basePrice'],
  [{ basePrice: '1e3' }, 'basePrice'],
  [{ isAvailable: 'yes' }, 'isAvailable'],
] as const)('validates ad-slot input %j', async (change, field) => {
  for (const action of [slots.createAdSlot, slots.updateAdSlot.bind(null, 'id')]) {
    expect((await action({}, form({ ...slot, ...change }))).fieldErrors).toHaveProperty(field);
  }
  expect(fetchMock).not.toHaveBeenCalled();
});
it('returns all required field errors for an empty submission', async () => {
  expect((await campaigns.createCampaign({}, new FormData())).fieldErrors).toMatchObject({
    name: expect.any(String),
    budget: expect.any(String),
    startDate: expect.any(String),
    endDate: expect.any(String),
  });
  expect((await slots.createAdSlot({}, new FormData())).fieldErrors).toMatchObject({
    name: expect.any(String),
    type: expect.any(String),
    basePrice: expect.any(String),
  });
});
it('handles network/session infrastructure failure safely', async () => {
  fetchMock.mockRejectedValueOnce(new Error('private connection string'));
  expect(await campaigns.createCampaign({}, form(campaign))).toEqual({
    error: 'Unable to save your changes. Please try again.',
  });
  getSession.mockRejectedValueOnce(new Error('private session failure'));
  expect(await slots.deleteAdSlot('id', {}, new FormData())).toEqual({
    error: 'Unable to save your changes. Please try again.',
  });
  expect(revalidatePath).not.toHaveBeenCalled();
});
it('requires an ID for edits and deletes', async () => {
  expect(await campaigns.updateCampaign('', {}, form(campaign))).toHaveProperty('error');
  expect(await slots.deleteAdSlot('', {}, new FormData())).toHaveProperty('error');
  expect(fetchMock).not.toHaveBeenCalled();
});

it('loads publisher-owned ad slots on the server with cookies and no cache', async () => {
  fetchMock
    .mockResolvedValueOnce(Response.json({ role: 'publisher', publisherId: 'publisher-1' }))
    .mockResolvedValueOnce(Response.json([{ id: 'slot-1' }]));
  expect(await slots.getPublisherAdSlots()).toEqual([{ id: 'slot-1' }]);
  expect(fetchMock.mock.calls[1][0]).toContain('/api/ad-slots?publisherId=publisher-1');
  for (const [, options] of fetchMock.mock.calls) {
    expect(options?.cache).toBe('no-store');
    expect(new Headers(options?.headers).get('cookie')).toBe('session=test');
  }
});
it('redirects anonymous and wrong-role publisher visitors and rejects a missing profile', async () => {
  getSession.mockResolvedValueOnce(null);
  await expect(slots.getPublisherAdSlots()).rejects.toThrow('Redirect: /login');
  expect(fetchMock).not.toHaveBeenCalled();
  fetchMock
    .mockResolvedValueOnce(Response.json({ role: 'sponsor' }))
    .mockResolvedValueOnce(Response.json({ role: 'publisher' }));
  await expect(slots.getPublisherAdSlots()).rejects.toThrow('Redirect: /');
  await expect(slots.getPublisherAdSlots()).rejects.toThrow('Publisher profile is missing');
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it('allows campaign updates to omit unchanged dates while requiring them for creation', async () => {
  const data = form(campaign);
  data.delete('startDate');
  data.delete('endDate');
  fetchMock.mockImplementation(async () => Response.json({ id: 'id' }));
  expect(await campaigns.updateCampaign('id', {}, data)).toEqual({ success: true });
  expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).not.toHaveProperty('startDate');
  expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).not.toHaveProperty('endDate');
  const created = await campaigns.createCampaign({}, data);
  expect(created.fieldErrors).toHaveProperty('startDate');
  expect(created.fieldErrors).toHaveProperty('endDate');
  data.set('endDate', '2026-10-22');
  expect(await campaigns.updateCampaign('id', {}, data)).toEqual({ success: true });
  expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toMatchObject({
    endDate: '2026-10-22',
  });
  data.set('endDate', '');
  expect((await campaigns.updateCampaign('id', {}, data)).fieldErrors).toHaveProperty('endDate');
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
