// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Nav } from './nav';

const auth = vi.hoisted(() => ({ useSession: vi.fn(), signOut: vi.fn() }));
vi.mock('@/auth-client', () => ({ authClient: auth }));
vi.mock('next/navigation', () => ({ usePathname: () => '/dashboard/sponsor' }));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  vi.unstubAllGlobals();
});

it('shows login for visitors without exposing a role-specific link', () => {
  auth.useSession.mockReturnValue({ data: null, isPending: false });
  render(<Nav />);
  expect(screen.getByRole('link', { name: 'Login' }).getAttribute('href')).toBe('/login');
  expect(screen.queryByRole('link', { name: 'My Campaigns' })).toBeNull();
});

it('marks the current role dashboard and recovers from sign-out failure', async () => {
  auth.useSession.mockReturnValue({
    data: { user: { id: 'sponsor', name: 'Demo Sponsor' } },
    isPending: false,
  });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: async () => ({ role: 'sponsor' }) }));
  auth.signOut.mockResolvedValue({ error: { message: 'private infrastructure detail' } });
  render(<Nav />);
  expect(
    (await screen.findByRole('link', { name: 'My Campaigns' })).getAttribute('aria-current')
  ).toBe('page');
  fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
  expect((await screen.findByRole('alert')).textContent).toBe(
    'Unable to log out. Please try again.'
  );
  expect(screen.getByRole('button', { name: 'Logout' }).matches(':disabled')).toBe(false);
});

it('uses account and navigation skeletons while the session is loading', () => {
  auth.useSession.mockReturnValue({ data: null, isPending: true });
  render(<Nav />);
  for (const status of screen.getAllByRole('status')) {
    expect(status.querySelector('.sr-only')?.textContent).toMatch(/Loading/);
    expect(status.querySelector('.dashboard-skeleton')).toBeTruthy();
  }
  expect(screen.queryByRole('link', { name: 'Login' })).toBeNull();
});

it('clears role placeholders when the role lookup fails', async () => {
  auth.useSession.mockReturnValue({
    data: { user: { id: 'sponsor', name: 'Demo Sponsor' } },
    isPending: false,
  });
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('unavailable')));
  render(<Nav />);
  expect(screen.getByRole('status').textContent).toBe('Loading navigation...');
  await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
  expect(screen.getByRole('button', { name: 'Logout' })).toBeTruthy();
});
