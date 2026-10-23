// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AdSlotDetail } from './ad-slot-detail';
import { api, getMarketplaceAdSlot } from '@/lib/api';
import { getUserRole } from '@/lib/auth-helpers';

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  api: vi.fn(),
  getMarketplaceAdSlot: vi.fn(),
}));
vi.mock('@/auth-client', () => ({
  authClient: { getSession: async () => ({ data: { user: { id: 'user' } } }) },
}));
vi.mock('@/lib/auth-helpers', () => ({ getUserRole: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

const slot = {
  id: 'listing',
  name: 'Newsletter placement',
  description: null,
  type: 'NEWSLETTER' as const,
  basePrice: '100',
  isAvailable: false,
  publisherId: 'owner',
  publisher: { id: 'owner', name: 'Daily Journal' },
};

it.each([
  { role: 'sponsor' as const, sponsorId: 'sponsor' },
  { role: 'publisher' as const, publisherId: 'someone-else' },
])('shows catalog details without booking or reset controls for $role', async (role) => {
  vi.mocked(getMarketplaceAdSlot).mockResolvedValue(slot);
  vi.mocked(getUserRole).mockResolvedValue(role);
  render(<AdSlotDetail id={slot.id} />);
  await screen.findByRole('heading', { name: slot.name });
  expect(screen.getByText('Browse placements here. Booking is not available.')).toBeTruthy();
  expect(screen.queryByRole('button')).toBeNull();
});

it('allows the owning publisher to reset an unavailable listing and reports failure', async () => {
  vi.mocked(getMarketplaceAdSlot).mockResolvedValue(slot);
  vi.mocked(getUserRole).mockResolvedValue({ role: 'publisher', publisherId: 'owner' });
  vi.mocked(api).mockRejectedValueOnce(new Error('private details'));
  render(<AdSlotDetail id={slot.id} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Reset listing' }));
  expect((await screen.findByRole('alert')).textContent).toBe(
    'Unable to reset listing. Please try again.'
  );
  vi.mocked(api).mockResolvedValueOnce({ adSlot: { ...slot, isAvailable: true } });
  fireEvent.click(screen.getByRole('button', { name: 'Reset listing' }));
  await screen.findByText('Available');
  expect(api).toHaveBeenLastCalledWith('/api/ad-slots/listing/unbook', { method: 'POST' });
  expect(screen.queryByRole('button')).toBeNull();
});
