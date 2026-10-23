import { createServer } from 'node:http';
import { once } from 'node:events';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import app from './app.js';
import { Prisma } from './generated/prisma/client.js';

const { getSession, db } = vi.hoisted(() => ({
  getSession: vi.fn(),
  db: {
    $transaction: vi.fn(),
    sponsor: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), count: vi.fn() },
    publisher: { findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    campaign: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    adSlot: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
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
  db.$transaction.mockImplementation(async (operation) => operation(db));
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
            ...(ownerKey === 'sponsorId' && {
              startDate: new Date('2026-10-21'),
              endDate: new Date('2026-10-22'),
            }),
          }
    );
    model.findMany.mockImplementation(async ({ where }) => [{ [ownerKey]: where[ownerKey] }]);
    model.create.mockImplementation(async ({ data }) => ({ id: 'new', ...data }));
    model.update.mockImplementation(async ({ data }) => ({ id: 'owned', ...data }));
    model.delete.mockResolvedValue({ id: 'owned' });
  }
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

describe('read-only marketplace', () => {
  const catalogSelect = {
    id: true,
    name: true,
    description: true,
    type: true,
    basePrice: true,
    isAvailable: true,
    publisherId: true,
    publisher: { select: { id: true, name: true, website: true } },
  };

  it.each(['', 'invalid-cookie', 'unassigned'])(
    'rejects unauthorized identity: %s',
    async (user) => {
      for (const path of ['/marketplace/ad-slots', '/marketplace/ad-slots/other']) {
        expect((await request(path, user)).status).toBe(user === 'unassigned' ? 403 : 401);
      }
      expect(db.adSlot.findMany).not.toHaveBeenCalled();
      expect(db.adSlot.findUnique).not.toHaveBeenCalled();
    }
  );

  it.each(['sponsor', 'publisher'])(
    'lets %s browse other publishers with only catalog fields',
    async (user) => {
      const slot = { id: 'other', publisherId: 'other-profile', name: 'Newsletter placement' };
      db.adSlot.findMany.mockResolvedValue([slot]);
      const list = await request('/marketplace/ad-slots', user);
      expect(list.status).toBe(200);
      expect(list.headers.get('cache-control')).toBe('no-store');
      expect(await list.json()).toEqual([slot]);
      expect(db.adSlot.findMany).toHaveBeenCalledWith({
        select: catalogSelect,
        orderBy: { basePrice: 'desc' },
      });

      db.adSlot.findUnique.mockResolvedValue(slot);
      const detail = await request('/marketplace/ad-slots/other', user);
      expect(detail.status).toBe(200);
      expect(await detail.json()).toEqual(slot);
      expect(db.adSlot.findUnique).toHaveBeenCalledWith({
        where: { id: 'other' },
        select: catalogSelect,
      });
    }
  );

  it('returns an empty catalog and 404 for missing listings', async () => {
    db.adSlot.findMany.mockResolvedValue([]);
    expect(await (await request('/marketplace/ad-slots', 'sponsor')).json()).toEqual([]);
    expect((await request('/marketplace/ad-slots/missing', 'sponsor')).status).toBe(404);
  });

  it('does not expose writes through the catalog', async () => {
    for (const [method, suffix] of [
      ['POST', ''],
      ['PUT', '/other'],
      ['DELETE', '/other'],
      ['POST', '/other/book'],
      ['POST', '/other/unbook'],
    ]) {
      expect((await request(`/marketplace/ad-slots${suffix}`, 'sponsor', method, {})).status).toBe(
        404
      );
    }
    expect(db.adSlot.create).not.toHaveBeenCalled();
    expect(db.adSlot.update).not.toHaveBeenCalled();
    expect(db.adSlot.delete).not.toHaveBeenCalled();
  });

  it('hides database errors for catalog and detail reads', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    db.adSlot.findMany.mockRejectedValue(new Error('private database details'));
    db.adSlot.findUnique.mockRejectedValue(new Error('private database details'));
    for (const path of ['/marketplace/ad-slots', '/marketplace/ad-slots/other']) {
      const response = await request(path, 'sponsor');
      expect(response.status).toBe(500);
      expect(await response.text()).not.toContain('private database details');
    }
  });
});

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
      expect(model.update).not.toHaveBeenCalled();
      expect(model.delete).not.toHaveBeenCalled();
    });

    it.each(['invalid-cookie', 'unassigned', user === 'sponsor' ? 'publisher' : 'sponsor'])(
      'rejects an invalid session or wrong/missing role: %s',
      async (identity) => {
        for (const [method, suffix] of [
          ['GET', ''],
          ['POST', ''],
          ['PUT', '/owned'],
          ['DELETE', '/owned'],
        ]) {
          expect(
            (
              await request(
                `${path}${suffix}`,
                identity,
                method,
                method === 'POST' || method === 'PUT' ? body : undefined
              )
            ).status
          ).toBe(identity === 'invalid-cookie' ? 401 : 403);
        }
        expect(model.create).not.toHaveBeenCalled();
        expect(model.update).not.toHaveBeenCalled();
        expect(model.delete).not.toHaveBeenCalled();
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
        expect(model.update).not.toHaveBeenCalled();
        expect(model.delete).not.toHaveBeenCalled();
      }
    );

    it('returns an owned detail without expanding counterpart private data', async () => {
      const response = await request(`${path}/owned`, user);
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ id: 'owned', [key]: owner });
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

    it('updates only supplied writable fields under the session owner', async () => {
      const update = { name: 'Updated', description: null };
      const response = await request(`${path}/owned`, user, 'PUT', update);
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject(update);
      expect(model.update).toHaveBeenCalledWith({
        where: { id: 'owned', [key]: owner },
        data: update,
      });
    });

    it('allows a matching update owner ID but refuses ownership transfers', async () => {
      expect(
        (await request(`${path}/owned`, user, 'PUT', { name: 'Updated', [key]: owner })).status
      ).toBe(200);
      expect(model.update).toHaveBeenLastCalledWith(
        expect.objectContaining({ data: { name: 'Updated' } })
      );
      model.update.mockClear();
      expect(
        (await request(`${path}/owned`, user, 'PUT', { name: 'Updated', [key]: 'other' })).status
      ).toBe(403);
      expect(model.update).not.toHaveBeenCalled();
    });

    it('deletes an owned resource with an empty 204 response', async () => {
      const response = await request(`${path}/owned`, user, 'DELETE');
      expect(response.status).toBe(204);
      expect(await response.text()).toBe('');
      expect(model.delete).toHaveBeenCalledWith({ where: { id: 'owned', [key]: owner } });
    });

    it.each(['POST', 'PUT'])(
      'rejects malformed and read-only fields on %s without writing',
      async (method) => {
        const endpoint = method === 'POST' ? path : `${path}/owned`;
        for (const invalid of [
          [],
          { ...body, name: '  ' },
          { ...body, name: 1 },
          { ...body, name: 'bad\u0000name' },
          { ...body, description: 'bad\u0000description' },
          { ...body, description: {} },
          { ...body, id: 'forged' },
          { ...body, createdAt: '2026-10-21' },
          { ...body, typo: true },
        ]) {
          expect((await request(endpoint, user, method, invalid)).status).toBe(400);
        }
        expect((await request(endpoint, user, method)).status).toBe(400);
        expect(model.create).not.toHaveBeenCalled();
        expect(model.update).not.toHaveBeenCalled();
      }
    );

    it('rejects an empty update or an owner-only update', async () => {
      for (const update of [{}, { [key]: owner }]) {
        expect((await request(`${path}/owned`, user, 'PUT', update)).status).toBe(400);
      }
      expect(model.update).not.toHaveBeenCalled();
    });

    it.each(['POST', 'PUT', 'DELETE'])(
      'logs %s failures and returns a generic JSON 500',
      async (method) => {
        const log = vi.spyOn(console, 'error').mockImplementation(() => {});
        const write =
          method === 'POST' ? model.create : method === 'PUT' ? model.update : model.delete;
        write.mockRejectedValueOnce(new Error('private database detail'));
        const response = await request(
          method === 'POST' ? path : `${path}/owned`,
          user,
          method,
          method === 'DELETE' ? undefined : body
        );
        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({ error: expect.stringContaining('Failed to') });
        expect(log).toHaveBeenCalled();
      }
    );

    it.each(['PUT', 'DELETE'])('returns 404 if the record disappears before %s', async (method) => {
      const write = method === 'PUT' ? model.update : model.delete;
      write.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: 'P2025',
          clientVersion: 'test',
        })
      );
      expect(
        (
          await request(
            `${path}/owned`,
            user,
            method,
            method === 'PUT' ? { name: 'Updated' } : undefined
          )
        ).status
      ).toBe(404);
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

it('filters unavailable ad slots without losing the owner scope', async () => {
  expect((await request('/ad-slots?available=false', 'publisher')).status).toBe(200);
  expect(db.adSlot.findMany).toHaveBeenCalledWith(
    expect.objectContaining({ where: { publisherId: 'publisher-1', isAvailable: false } })
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

it.each(['POST', 'PUT'])(
  'validates campaign money, dates, enums and targeting on %s',
  async (method) => {
    const body = resources[0].body;
    const path = method === 'POST' ? '/campaigns' : '/campaigns/owned';
    const changes = [
      { budget: 0 },
      { budget: -1 },
      { budget: '100' },
      { budget: true },
      { budget: null },
      { budget: 100_000_000 },
      { budget: 1.001 },
      { cpmRate: -1 },
      { cpcRate: '1' },
      { startDate: 'invalid' },
      { startDate: 0 },
      { startDate: null },
      { startDate: '2026-02-30' },
      { startDate: '0000-01-01' },
      { startDate: '0001-01-01T00:00:00+01:00' },
      { endDate: '2026-10-20' },
      { endDate: body.startDate },
      { status: 'invalid' },
      { status: 'toString' },
      { targetCategories: 'news' },
      { targetRegions: [1] },
      { targetRegions: ['bad\u0000region'] },
      { targetCategories: [''] },
      { targetRegions: null },
      { spent: 0 },
    ];
    for (const change of changes) {
      expect((await request(path, 'sponsor', method, { ...body, ...change })).status).toBe(400);
    }
    expect(db.campaign.create).not.toHaveBeenCalled();
    expect(db.campaign.update).not.toHaveBeenCalled();
  }
);

it('validates a single changed date against the persisted campaign date', async () => {
  for (const update of [{ startDate: '2026-10-23' }, { endDate: '2026-10-20' }]) {
    expect((await request('/campaigns/owned', 'sponsor', 'PUT', update)).status).toBe(400);
  }
  expect(db.campaign.update).not.toHaveBeenCalled();
  expect(
    (await request('/campaigns/owned', 'sponsor', 'PUT', { endDate: '2026-10-24' })).status
  ).toBe(200);
  expect(db.campaign.update).toHaveBeenCalledWith({
    where: { id: 'owned', sponsorId: 'sponsor-1' },
    data: { endDate: new Date('2026-10-24') },
  });
});

it('handles a campaign disappearing between ownership and date lookup', async () => {
  db.campaign.findUnique
    .mockResolvedValueOnce({ sponsorId: 'sponsor-1' })
    .mockResolvedValueOnce(null);
  expect((await request('/campaigns/owned', 'sponsor', 'PUT', { name: 'Updated' })).status).toBe(
    404
  );
  expect(db.campaign.update).not.toHaveBeenCalled();
});

it.each(['POST', 'PUT'])('accepts all writable campaign fields on %s', async (method) => {
  const body = {
    ...resources[0].body,
    name: ' Campaign ',
    description: null,
    budget: 99_999_999.99,
    cpmRate: 0.29,
    cpcRate: null,
    status: 'PAUSED',
    targetCategories: ['Tech'],
    targetRegions: [],
    startDate: '2026-10-21T09:00:00-04:00',
    endDate: '2026-10-23T13:00:00.000Z',
  };
  const response = await request(
    method === 'POST' ? '/campaigns' : '/campaigns/owned',
    'sponsor',
    method,
    body
  );
  expect(response.status).toBe(method === 'POST' ? 201 : 200);
  const write = method === 'POST' ? db.campaign.create : db.campaign.update;
  expect(write).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        ...body,
        name: 'Campaign',
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
      }),
    })
  );
});

it.each(['POST', 'PUT'])(
  'validates ad slot price, type and optional fields on %s',
  async (method) => {
    const body = resources[1].body;
    const path = method === 'POST' ? '/ad-slots' : '/ad-slots/owned';
    for (const change of [
      { basePrice: 0 },
      { basePrice: -1 },
      { basePrice: '100' },
      { basePrice: true },
      { basePrice: null },
      { basePrice: 100_000_000 },
      { basePrice: 1.001 },
      { type: 'invalid' },
      { type: 'toString' },
      { type: [] },
      { cpmFloor: -1 },
      { position: 1 },
      { position: 'bad\u0000position' },
      { width: 0 },
      { height: 1.5 },
      { width: 2_147_483_648 },
      { height: '100' },
      { isAvailable: 'false' },
      { isAvailable: null },
    ]) {
      expect((await request(path, 'publisher', method, { ...body, ...change })).status).toBe(400);
    }
    expect(db.adSlot.create).not.toHaveBeenCalled();
    expect(db.adSlot.update).not.toHaveBeenCalled();
  }
);

it.each(['POST', 'PUT'])(
  'accepts all writable ad slot fields, including false and null, on %s',
  async (method) => {
    const body = {
      ...resources[1].body,
      name: ' Slot ',
      description: null,
      type: 'NEWSLETTER',
      basePrice: 0.29,
      position: 'Top',
      width: 300,
      height: null,
      cpmFloor: 0,
      isAvailable: false,
    };
    const response = await request(
      method === 'POST' ? '/ad-slots' : '/ad-slots/owned',
      'publisher',
      method,
      body
    );
    expect(response.status).toBe(method === 'POST' ? 201 : 200);
    const write = method === 'POST' ? db.adSlot.create : db.adSlot.update;
    expect(write).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ ...body, name: 'Slot' }) })
    );
  }
);

it('validates and writes campaign dates in one serializable transaction', async () => {
  const tx = {
    campaign: {
      findUnique: vi
        .fn()
        .mockResolvedValue({ startDate: new Date('2026-10-21'), endDate: new Date('2026-10-22') }),
      update: vi.fn().mockResolvedValue({ id: 'owned' }),
    },
  };
  db.$transaction.mockImplementation(async (operation) => operation(tx));
  expect(
    (await request('/campaigns/owned', 'sponsor', 'PUT', { endDate: '2026-10-24' })).status
  ).toBe(200);
  expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), {
    isolationLevel: 'Serializable',
  });
  expect(tx.campaign.findUnique).toHaveBeenCalledWith({
    where: { id: 'owned', sponsorId: 'sponsor-1' },
    select: { startDate: true, endDate: true },
  });
  expect(tx.campaign.update).toHaveBeenCalledWith({
    where: { id: 'owned', sponsorId: 'sponsor-1' },
    data: { endDate: new Date('2026-10-24') },
  });
  expect(db.campaign.update).not.toHaveBeenCalled();
});

it('returns a retryable 409 for a campaign transaction conflict', async () => {
  db.$transaction.mockRejectedValueOnce(
    new Prisma.PrismaClientKnownRequestError('private conflict detail', {
      code: 'P2034',
      clientVersion: 'test',
    })
  );
  const response = await request('/campaigns/owned', 'sponsor', 'PUT', { endDate: '2026-10-24' });
  expect(response.status).toBe(409);
  expect(await response.json()).toEqual({
    error: 'Campaign changed during this request; retry the update',
  });
});
