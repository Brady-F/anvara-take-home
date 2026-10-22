// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { AdSlotGrid } from './ad-slot-grid';
import { getAdSlots } from '@/lib/api';

vi.mock('@/lib/api', () => ({ getAdSlots: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

it('keeps listing links, readable formats, availability, and price cents', async () => {
  vi.mocked(getAdSlots).mockResolvedValue([
    {
      id: 'native-slot',
      name: 'Article placement',
      type: 'NATIVE',
      description: null,
      basePrice: '450.75',
      isAvailable: false,
      publisherId: 'publisher',
      publisher: { id: 'publisher', name: 'Daily Journal' },
    },
  ]);
  render(<AdSlotGrid />);
  const link = await screen.findByRole('link', { name: /Article placement/ });
  expect(link.getAttribute('href')).toBe('/marketplace/native-slot');
  expect(link.textContent).toContain('Native');
  expect(link.textContent).toContain('Unavailable');
  expect(link.textContent).toContain('$450.75');
  expect(link.textContent).toContain('Daily Journal');
});

it('shows a safe failure after loading instead of exposing request details', async () => {
  vi.mocked(getAdSlots).mockRejectedValue(new Error('private infrastructure details'));
  render(<AdSlotGrid />);
  expect(screen.getByRole('status').textContent).toContain('Loading marketplace');
  const alert = await screen.findByRole('alert');
  expect(alert.textContent).toContain('We couldn’t load the marketplace');
  expect(alert.textContent).not.toContain('private infrastructure details');
  expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
});
