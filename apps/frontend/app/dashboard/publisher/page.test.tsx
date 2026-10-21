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
  const html = renderToStaticMarkup(await PublisherDashboard());
  for (const value of ['Sidebar', '123.45', 'Booked', 'Create Ad Slot', 'Edit Ad Slot', 'Delete'])
    expect(html).toContain(value);
});
it('keeps the publisher empty state', async () => {
  vi.mocked(getPublisherAdSlots).mockResolvedValue([]);
  expect(renderToStaticMarkup(await PublisherDashboard())).toContain('No ad slots yet.');
});
