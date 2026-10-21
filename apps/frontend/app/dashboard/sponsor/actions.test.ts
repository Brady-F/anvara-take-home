import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { auth } from '@/auth';
import { getSponsorCampaigns } from './actions';

vi.mock('@/auth', () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock('next/headers', () => ({ headers: async () => new Headers({ cookie: 'session=test' }) }));
vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    throw new Error(`Redirect: ${path}`);
  },
}));

const fetchMock = vi.fn<typeof fetch>();
const getSession = vi.mocked(auth.api.getSession);

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

describe('sponsor campaign Server Action', () => {
  it('redirects anonymous visitors before making backend requests', async () => {
    getSession.mockResolvedValue(null);

    await expect(getSponsorCampaigns()).rejects.toThrow('Redirect: /login');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(['publisher', null])('rejects the %s role before requesting campaigns', async (role) => {
    fetchMock.mockResolvedValueOnce(Response.json({ role }));

    await expect(getSponsorCampaigns()).rejects.toThrow('Redirect: /');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not fall back to listing all campaigns when the sponsor ID is missing', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ role: 'sponsor' }));

    await expect(getSponsorCampaigns()).rejects.toThrow('Sponsor profile is missing');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('uses the session sponsor and uncached requests on every call', async () => {
    for (const sponsorId of ['sponsor-1', 'sponsor-2']) {
      const campaigns = [{ id: `campaign-${sponsorId}`, sponsorId }];
      fetchMock
        .mockResolvedValueOnce(Response.json({ role: 'sponsor', sponsorId }))
        .mockResolvedValueOnce(Response.json(campaigns));

      await expect(getSponsorCampaigns()).resolves.toEqual(campaigns);
      expect(fetchMock).toHaveBeenNthCalledWith(
        fetchMock.mock.calls.length - 1,
        expect.stringMatching(/\/api\/auth\/role\/user-1$/),
        expect.objectContaining({ cache: 'no-store' })
      );
      expect(fetchMock).toHaveBeenLastCalledWith(
        expect.stringMatching(new RegExp(`/api/campaigns\\?sponsorId=${sponsorId}$`)),
        expect.objectContaining({ cache: 'no-store' })
      );
    }
    expect(getSession).toHaveBeenCalledWith({ headers: expect.any(Headers) });
  });

  it('returns an empty list for a sponsor with no campaigns', async () => {
    fetchMock
      .mockResolvedValueOnce(Response.json({ role: 'sponsor', sponsorId: 'sponsor-1' }))
      .mockResolvedValueOnce(Response.json([]));

    await expect(getSponsorCampaigns()).resolves.toEqual([]);
  });

  it('propagates role API failures instead of redirecting home', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ error: 'Unavailable' }, { status: 503 }));

    await expect(getSponsorCampaigns()).rejects.toThrow('API request failed');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('propagates campaign API failures to the error boundary', async () => {
    fetchMock
      .mockResolvedValueOnce(Response.json({ role: 'sponsor', sponsorId: 'sponsor-1' }))
      .mockResolvedValueOnce(Response.json({ error: 'Unavailable' }, { status: 500 }));

    await expect(getSponsorCampaigns()).rejects.toThrow('API request failed');
  });

  it('propagates connection failures to the error boundary', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));

    await expect(getSponsorCampaigns()).rejects.toThrow('fetch failed');
  });
});
