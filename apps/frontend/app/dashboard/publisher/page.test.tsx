// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { getPublisherAdSlots } from './actions';
import PublisherDashboard from './page';

vi.mock('./actions', () => ({
  getPublisherAdSlots: vi.fn(),
  createAdSlot: vi.fn(),
  updateAdSlot: vi.fn(),
  deleteAdSlot: vi.fn(),
}));
afterEach(() => vi.resetAllMocks());
it('renders publisher slots and mutation controls from server-fetched props', async () => {
  vi.mocked(getPublisherAdSlots).mockResolvedValue([
    {
      id: 'slot-1',
      publisherId: 'publisher-1',
      name: 'Sidebar',
      description: null,
      type: 'NATIVE',
      basePrice: '123.45',
      isAvailable: false,
    },
  ]);
  const html = renderToStaticMarkup(
    await PublisherDashboard({ searchParams: Promise.resolve({}) })
  );
  for (const value of [
    'Sidebar',
    '123.45',
    'Unavailable',
    'Create Ad Slot',
    'Edit Ad Slot',
    'Delete',
  ])
    expect(html).toContain(value);
});
it('keeps the publisher empty state', async () => {
  vi.mocked(getPublisherAdSlots).mockResolvedValue([]);
  expect(
    renderToStaticMarkup(await PublisherDashboard({ searchParams: Promise.resolve({}) }))
  ).toContain('No ad slots yet.');
});

it('keeps availability totals independent of filters and renders only matching cards', async () => {
  const slot = {
    id: '1',
    publisherId: 'publisher',
    name: 'Unavailable banner',
    description: null,
    type: 'DISPLAY' as const,
    basePrice: '123.45',
    isAvailable: false,
  };
  vi.mocked(getPublisherAdSlots).mockResolvedValue([
    slot,
    { ...slot, id: '2', name: 'Available banner', isAvailable: true },
  ]);
  const html = renderToStaticMarkup(
    await PublisherDashboard({ searchParams: Promise.resolve({ availability: 'unavailable' }) })
  );
  expect(html).toContain('Unavailable banner');
  expect(html).not.toContain('Available banner');
  expect(html).toContain('<dt>Total ad slots</dt><dd>2</dd>');
  expect(html).toContain('<dt>Available</dt><dd>1</dd>');
  expect(html).toContain('<dt>Unavailable</dt><dd>1</dd>');
});
