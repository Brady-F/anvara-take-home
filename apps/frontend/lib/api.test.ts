import { afterEach, expect, it, vi } from 'vitest';
import { api, createCampaign, createAdSlot } from './api';
import { getUserRole } from './auth-helpers';

const fetchMock = vi.fn<typeof fetch>();
afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllGlobals();
});

it('sends cookies and avoids caching private API data while preserving request options', async () => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockResolvedValue(Response.json({ id: 'created' }));
  await expect(
    api('/api/campaigns', {
      method: 'POST',
      body: '{}',
      headers: new Headers({ cookie: 'session=test' }),
    })
  ).resolves.toEqual({ id: 'created' });
  const options = fetchMock.mock.calls[0][1];
  expect(options).toMatchObject({
    credentials: 'include',
    cache: 'no-store',
    method: 'POST',
    body: '{}',
  });
  expect(new Headers(options?.headers).get('cookie')).toBe('session=test');
  expect(new Headers(options?.headers).get('content-type')).toBe('application/json');
});

it('forwards server cookies for role lookup and retains its failure behavior', async () => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockResolvedValueOnce(Response.json({ role: 'publisher', publisherId: 'publisher-1' }));
  await expect(
    getUserRole('user-1', { headers: { cookie: 'session=test' } })
  ).resolves.toMatchObject({ role: 'publisher' });
  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringContaining('/api/auth/role/user-1'),
    expect.objectContaining({
      credentials: 'include',
      cache: 'no-store',
      headers: { cookie: 'session=test' },
    })
  );
  fetchMock.mockResolvedValueOnce(Response.json({ error: 'Not authenticated' }, { status: 401 }));
  await expect(getUserRole('user-1')).resolves.toEqual({ role: null });
});

it('lets typed creation callers omit the owner IDs supplied by the server', async () => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockImplementation(async () => Response.json({ id: 'created' }));
  await createCampaign({
    name: 'New',
    budget: 100,
    startDate: '2026-10-21',
    endDate: '2026-10-22',
  });
  await createAdSlot({ name: 'New', type: 'DISPLAY', basePrice: 100 });
  for (const [, options] of fetchMock.mock.calls) {
    expect(JSON.parse(String(options?.body))).not.toHaveProperty('sponsorId');
    expect(JSON.parse(String(options?.body))).not.toHaveProperty('publisherId');
  }
});

it('preserves backend validation messages and falls back safely for non-JSON failures', async () => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockResolvedValueOnce(
    Response.json({ error: 'budget must be positive' }, { status: 400 })
  );
  await expect(api('/api/campaigns')).rejects.toMatchObject({
    status: 400,
    message: 'budget must be positive',
  });
  fetchMock.mockResolvedValueOnce(new Response('proxy unavailable', { status: 502 }));
  await expect(api('/api/campaigns')).rejects.toMatchObject({
    status: 502,
    message: 'API request failed',
  });
});
