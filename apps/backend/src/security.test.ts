import { createServer } from 'node:http';
import { once } from 'node:events';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import app from './app.js';

const { getSession, db } = vi.hoisted(() => ({
  getSession: vi.fn(),
  db: {
    sponsor: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), count: vi.fn() },
    publisher: { findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    campaign: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), count: vi.fn() },
    adSlot: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    creative: { findUnique: vi.fn() },
    placement: { findMany: vi.fn(), create: vi.fn(), count: vi.fn(), aggregate: vi.fn() },
  },
}));
vi.mock('./session-auth.js', () => ({ auth: { api: { getSession } } }));
vi.mock('./db.js', async () => ({
  prisma: db,
  ...(await import('./generated/prisma/enums.js')),
}));
vi.hoisted(() => vi.stubEnv('BETTER_AUTH_URL', 'https://security-test.example'));
afterAll(() => vi.unstubAllEnvs());

const server = createServer(app);
let baseURL: string;

beforeAll(async () => {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing test server port');
  baseURL = `http://127.0.0.1:${address.port}`;
});
afterAll(
  () =>
    new Promise<void>((resolve, reject) => {
      if (!server.listening) return resolve();
      server.close((error) => (error ? reject(error) : resolve()));
    })
);

afterEach(() => vi.restoreAllMocks());
beforeEach(() => {
  vi.resetAllMocks();
  getSession.mockImplementation(async ({ headers }: { headers: Headers }) => {
    const id = headers.get('cookie');
    return ['sponsor', 'publisher', 'unassigned'].includes(id || '')
      ? { user: { id, email: `${id}@example.com` } }
      : null;
  });
  for (const [model, userId] of [
    [db.sponsor, 'sponsor'],
    [db.publisher, 'publisher'],
  ] as const) {
    model.findUnique.mockImplementation(async ({ where }) => {
      if (where.userId) return where.userId === userId ? { id: `${userId}-1`, userId } : null;
      return where.id === 'missing'
        ? null
        : { id: where.id, userId: where.id === `${userId}-1` ? userId : 'other' };
    });
    model.findMany.mockImplementation(async ({ where }) => [{ userId: where.userId }]);
    model.count.mockResolvedValue(1);
  }
  for (const [model, ownerKey, ownerId] of [
    [db.campaign, 'sponsorId', 'sponsor-1'],
    [db.adSlot, 'publisherId', 'publisher-1'],
  ] as const) {
    model.findUnique.mockImplementation(async ({ where }) =>
      where.id === 'missing'
        ? null
        : {
            id: where.id,
            [ownerKey]: where.id === 'other' ? 'other-profile' : ownerId,
          }
    );
    model.findMany.mockImplementation(async ({ where }) => [{ [ownerKey]: where[ownerKey] }]);
    model.create.mockImplementation(async ({ data }) => ({ id: 'new', ...data }));
  }
  db.adSlot.update.mockResolvedValue({ id: 'owned', isAvailable: true });
  db.campaign.count.mockResolvedValue(1);
  db.placement.findMany.mockResolvedValue([]);
  db.placement.count.mockResolvedValue(0);
  db.placement.aggregate.mockResolvedValue({ _sum: {} });
  db.creative.findUnique.mockResolvedValue({ campaignId: 'owned' });
});

async function request(path: string, user = '', method = 'GET', body?: unknown) {
  return fetch(`${baseURL}/api${path}`, {
    method,
    headers: { cookie: user, 'Content-Type': 'application/json' },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
}

const resources = [
  {
    path: '/campaigns',
    user: 'sponsor',
    key: 'sponsorId',
    owner: 'sponsor-1',
    model: db.campaign,
    body: { name: 'New campaign', budget: 100, startDate: '2026-10-21', endDate: '2026-10-22' },
  },
  {
    path: '/ad-slots',
    user: 'publisher',
    key: 'publisherId',
    owner: 'publisher-1',
    model: db.adSlot,
    body: { name: 'New slot', type: 'DISPLAY', basePrice: 100 },
  },
];

for (const { path, user, key, owner, model, body } of resources) {
  describe(path, () => {
    it.each([
      ['GET', ''],
      ['POST', ''],
      ['GET', '/owned'],
      ['PUT', '/owned'],
      ['DELETE', '/owned'],
    ])('rejects anonymous %s %s before resource queries', async (method, suffix) => {
      expect((await request(`${path}${suffix}`, '', method)).status).toBe(401);
      expect(model.findUnique).not.toHaveBeenCalled();
      expect(model.findMany).not.toHaveBeenCalled();
      expect(model.create).not.toHaveBeenCalled();
    });

    it.each(['invalid-cookie', 'unassigned', user === 'sponsor' ? 'publisher' : 'sponsor'])(
      'rejects an invalid session or wrong/missing role: %s',
      async (identity) => {
        expect((await request(path, identity)).status).toBe(
          identity === 'invalid-cookie' ? 401 : 403
        );
        expect(model.findMany).not.toHaveBeenCalled();
      }
    );

    it('scopes an unfiltered list to the session profile', async () => {
      const response = await request(path, user);
      expect(response.status).toBe(200);
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(await response.json()).toEqual([{ [key]: owner }]);
      expect(model.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { [key]: owner } })
      );
    });

    it('allows its own owner filter and refuses a forged or repeated filter', async () => {
      expect((await request(`${path}?${key}=${owner}`, user)).status).toBe(200);
      model.findMany.mockClear();
      for (const query of [`${key}=other`, `${key}=${owner}&${key}=other`]) {
        expect((await request(`${path}?${query}`, user)).status).toBe(403);
      }
      expect(model.findMany).not.toHaveBeenCalled();
    });

    it.each(['GET', 'PUT', 'DELETE'])(
      'returns 403 for foreign and 404 for missing IDs on %s',
      async (method) => {
        expect((await request(`${path}/other`, user, method)).status).toBe(403);
        expect((await request(`${path}/missing`, user, method)).status).toBe(404);
      }
    );

    it('returns an owned detail without expanding counterpart private data', async () => {
      const response = await request(`${path}/owned`, user);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ id: 'owned', [key]: owner });
      expect(model.findUnique).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: { id: 'owned', [key]: owner },
          include: expect.objectContaining({ placements: true }),
        })
      );
    });

    it('creates under the session profile with no supplied owner ID', async () => {
      const response = await request(path, user, 'POST', body);
      expect(response.status).toBe(201);
      expect(await response.json()).toMatchObject({ [key]: owner });
      expect(model.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ [key]: owner }),
        })
      );
    });

    it('allows its own body owner ID and refuses a forged one without writing', async () => {
      expect((await request(path, user, 'POST', { ...body, [key]: owner })).status).toBe(201);
      model.create.mockClear();
      expect((await request(path, user, 'POST', { ...body, [key]: 'other' })).status).toBe(403);
      expect(model.create).not.toHaveBeenCalled();
    });

    it('preserves required-field validation', async () => {
      expect((await request(path, user, 'POST', {})).status).toBe(400);
      expect(model.create).not.toHaveBeenCalled();
    });
  });
}

it.each([
  ['/campaigns', 'sponsor', 'status'],
  ['/ad-slots', 'publisher', 'type'],
  ['/placements', 'sponsor', 'status'],
])('rejects malformed %s enum filters before querying resources', async (path, user, key) => {
  for (const query of [
    `${key}=invalid`,
    `${key}=`,
    `${key}=toString`,
    `${key}=ACTIVE&${key}=PAUSED`,
  ]) {
    expect((await request(`${path}?${query}`, user)).status).toBe(400);
  }
  expect(db.campaign.findMany).not.toHaveBeenCalled();
  expect(db.adSlot.findMany).not.toHaveBeenCalled();
  expect(db.placement.findMany).not.toHaveBeenCalled();
});

it('rejects malformed availability and placement ID filters', async () => {
  for (const query of ['available=invalid', 'available=', 'available=true&available=false']) {
    expect((await request(`/ad-slots?${query}`, 'publisher')).status).toBe(400);
  }
  for (const query of ['campaignId=', 'campaignId=first&campaignId=second', 'publisherId=']) {
    expect((await request(`/placements?${query}`, 'sponsor')).status).toBe(400);
  }
  expect(db.adSlot.findMany).not.toHaveBeenCalled();
  expect(db.placement.findMany).not.toHaveBeenCalled();
});

it('keeps valid filters inside the session ownership scope', async () => {
  expect((await request('/campaigns?status=DRAFT', 'sponsor')).status).toBe(200);
  expect(db.campaign.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: { sponsorId: 'sponsor-1', status: 'DRAFT' },
    })
  );
  expect((await request('/ad-slots?type=NEWSLETTER&available=true', 'publisher')).status).toBe(200);
  expect(db.adSlot.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: { publisherId: 'publisher-1', type: 'NEWSLETTER', isAvailable: true },
    })
  );
});

it('passes request cookies to Better Auth and bypasses cached session data', async () => {
  const response = await request('/auth/me', 'sponsor');
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    id: 'sponsor',
    email: 'sponsor@example.com',
    role: 'SPONSOR',
    sponsorId: 'sponsor-1',
  });
  const input = getSession.mock.calls[0][0];
  expect(input.headers.get('cookie')).toBe('sponsor');
  expect(input.query).toEqual({ disableCookieCache: true });
});

it('fails closed on session/database outages without returning internal errors', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  for (const mock of [
    getSession,
    db.sponsor.findUnique,
    db.campaign.findUnique,
    db.campaign.findMany,
  ]) {
    mock.mockRejectedValueOnce(new Error('private database detail'));
    const response = await request(
      mock === db.campaign.findUnique ? '/campaigns/owned' : '/campaigns',
      'sponsor'
    );
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain('private database detail');
  }
});

it('keeps role lookup self-only', async () => {
  expect((await request('/auth/role/sponsor')).status).toBe(401);
  expect((await request('/auth/role/other', 'sponsor')).status).toBe(403);
  const response = await request('/auth/role/publisher', 'publisher');
  expect(await response.json()).toMatchObject({ role: 'publisher', publisherId: 'publisher-1' });
  expect(await (await request('/auth/role/unassigned', 'unassigned')).json()).toEqual({
    role: null,
  });
});

it.each([
  ['sponsors', 'sponsor'],
  ['publishers', 'publisher'],
])('prevents the %s endpoints from bypassing ownership', async (path, user) => {
  expect((await request(`/${path}`)).status).toBe(401);
  expect(await (await request(`/${path}`, user)).json()).toEqual([{ userId: user }]);
  expect((await request(`/${path}/${user}-1`, user)).status).toBe(200);
  expect((await request(`/${path}/other`, user)).status).toBe(403);
  expect((await request(`/${path}/missing`, user)).status).toBe(404);
});

it('authenticates sponsor creation and binds new profiles to the session user', async () => {
  const body = { name: 'New sponsor', email: 'new@example.com', userId: 'other' };
  expect((await request('/sponsors', '', 'POST', body)).status).toBe(401);
  expect((await request('/sponsors', 'publisher', 'POST', body)).status).toBe(403);
  db.sponsor.create.mockResolvedValue({ id: 'new' });
  expect((await request('/sponsors', 'unassigned', 'POST', body)).status).toBe(201);
  expect(db.sponsor.create).toHaveBeenCalledWith({
    data: expect.objectContaining({ userId: 'unassigned' }),
  });
});

it('protects booking helpers and permits only the owning publisher to reset a slot', async () => {
  for (const action of ['book', 'unbook']) {
    expect((await request(`/ad-slots/owned/${action}`, '', 'POST')).status).toBe(401);
    expect((await request(`/ad-slots/owned/${action}`, 'sponsor', 'POST')).status).toBe(403);
    expect((await request(`/ad-slots/other/${action}`, 'publisher', 'POST')).status).toBe(403);
  }
  expect((await request('/ad-slots/owned/book', 'publisher', 'POST')).status).toBe(403);
  expect(db.adSlot.update).not.toHaveBeenCalled();
  expect((await request('/ad-slots/owned/unbook', 'publisher', 'POST')).status).toBe(200);
  expect(db.adSlot.update).toHaveBeenCalledWith(
    expect.objectContaining({ where: { id: 'owned', publisherId: 'publisher-1' } })
  );
});

it.each(['/placements', '/dashboard/stats'])('requires authentication for %s', async (path) => {
  expect((await request(path)).status).toBe(401);
  expect(db.placement.findMany).not.toHaveBeenCalled();
  expect(db.placement.aggregate).not.toHaveBeenCalled();
});

it.each(['sponsor', 'publisher', 'unassigned'])(
  'scopes placement reads and stats to %s',
  async (user) => {
    const scope = {
      OR: [{ campaign: { sponsor: { userId: user } } }, { publisher: { userId: user } }],
    };
    expect((await request('/placements?campaignId=other', user)).status).toBe(200);
    expect(db.placement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ...scope, campaignId: 'other' } })
    );
    expect((await request('/dashboard/stats', user)).status).toBe(200);
    expect(db.placement.aggregate).toHaveBeenCalledWith(expect.objectContaining({ where: scope }));
    expect(db.campaign.count).toHaveBeenCalledWith({
      where: { status: 'ACTIVE', sponsor: { userId: user } },
    });
  }
);

it('blocks indirect placement writes to other users’ resources', async () => {
  const body = {
    campaignId: 'owned',
    creativeId: 'creative',
    adSlotId: 'owned',
    publisherId: 'publisher-1',
    agreedPrice: 100,
  };
  expect((await request('/placements', '', 'POST', body)).status).toBe(401);
  expect((await request('/placements', 'publisher', 'POST', body)).status).toBe(403);
  expect((await request('/placements', 'sponsor', 'POST', body)).status).toBe(403);
  expect(
    (await request('/placements', 'sponsor', 'POST', { ...body, campaignId: 'missing' })).status
  ).toBe(403);
  expect(db.placement.create).not.toHaveBeenCalled();
  expect(db.campaign.findUnique).not.toHaveBeenCalled();
  expect(db.adSlot.findUnique).not.toHaveBeenCalled();
  expect(db.creative.findUnique).not.toHaveBeenCalled();
});

it('checks all placement relationships when a user owns both profiles', async () => {
  db.publisher.findUnique.mockResolvedValue({ id: 'publisher-1' });
  db.placement.create.mockImplementation(async ({ data }) => ({ id: 'new', ...data }));
  const body = {
    campaignId: 'owned',
    creativeId: 'creative',
    adSlotId: 'owned',
    publisherId: 'publisher-1',
    agreedPrice: 100,
    startDate: '2026-10-21',
    endDate: '2026-10-22',
  };
  expect((await request('/placements', 'sponsor', 'POST', body)).status).toBe(201);
  db.placement.create.mockClear();
  for (const change of [{ campaignId: 'other' }, { adSlotId: 'other' }, { publisherId: 'other' }]) {
    expect((await request('/placements', 'sponsor', 'POST', { ...body, ...change })).status).toBe(
      403
    );
  }
  expect(
    (await request('/placements', 'sponsor', 'POST', { ...body, campaignId: 'missing' })).status
  ).toBe(404);
  db.creative.findUnique.mockResolvedValueOnce({ campaignId: 'other' });
  expect((await request('/placements', 'sponsor', 'POST', body)).status).toBe(403);
  expect(db.placement.create).not.toHaveBeenCalled();
});

it('allows credentialed frontend CORS and rejects other origins before mutations', async () => {
  const response = await fetch(`${baseURL}/api/campaigns`, {
    method: 'OPTIONS',
    headers: { Origin: 'https://security-test.example', 'Access-Control-Request-Method': 'POST' },
  });
  expect(response.status).toBe(204);
  expect(response.headers.get('access-control-allow-origin')).toBe('https://security-test.example');
  expect(response.headers.get('access-control-allow-credentials')).toBe('true');
  expect(
    (
      await fetch(`${baseURL}/api/ad-slots/owned/unbook`, {
        method: 'POST',
        headers: { cookie: 'publisher', Origin: 'https://other.example' },
      })
    ).status
  ).toBe(403);
  expect(db.adSlot.update).not.toHaveBeenCalled();
});
