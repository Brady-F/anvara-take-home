import { expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { AdSlot, Campaign } from '@/lib/types';
import {
  campaignFilters,
  adSlotFilters,
  filterCampaigns,
  filterAdSlots,
  campaignStatuses,
  adSlotTypes,
} from './presentation';
import { CampaignCard } from './sponsor/components/campaign-card';
import { AdSlotCard } from './publisher/components/ad-slot-card';

vi.mock('./sponsor/components/campaign-editor', () => ({ CampaignEditor: () => null }));
vi.mock('./publisher/components/ad-slot-editor', () => ({ AdSlotEditor: () => null }));

const campaign: Campaign = {
  id: '1',
  sponsorId: 'sponsor',
  name: 'Reader launch',
  description: null,
  budget: '100.50',
  spent: '120.75',
  status: 'ACTIVE',
  startDate: '2026-10-21T00:00:00Z',
  endDate: '2026-10-23T00:00:00Z',
};
const slot: AdSlot = {
  id: '1',
  publisherId: 'publisher',
  name: 'Reader newsletter',
  description: null,
  basePrice: '250.75',
  type: 'NEWSLETTER',
  isAvailable: false,
};

it('combines case-insensitive name and status filters without changing API order', () => {
  const items: Campaign[] = [
    campaign,
    { ...campaign, id: '2', status: 'DRAFT' },
    { ...campaign, id: '3', name: 'Other' },
  ];
  expect(filterCampaigns(items, campaignFilters({ q: '  READER  ', status: 'ACTIVE' }))).toEqual([
    campaign,
  ]);
  expect(filterCampaigns(items, campaignFilters({}))).toEqual(items);
  expect(filterCampaigns(items, campaignFilters({ q: 'missing' }))).toEqual([]);
});

it('sorts budgets numerically in both directions and names alphabetically without mutating inputs', () => {
  const items = [campaign, { ...campaign, id: '2', name: 'Alpha', budget: '20.10' }];
  expect(
    filterCampaigns(items, campaignFilters({ sort: 'budget-asc' })).map((item) => item.id)
  ).toEqual(['2', '1']);
  expect(
    filterCampaigns(items, campaignFilters({ sort: 'budget-desc' })).map((item) => item.id)
  ).toEqual(['1', '2']);
  expect(filterCampaigns(items, campaignFilters({ sort: 'name' })).map((item) => item.id)).toEqual([
    '2',
    '1',
  ]);
  expect(items[0]).toBe(campaign);
});

it('combines publisher format and availability filters, including unavailable slots', () => {
  const items: AdSlot[] = [
    slot,
    { ...slot, id: '2', isAvailable: true },
    { ...slot, id: '3', type: 'DISPLAY' },
  ];
  expect(
    filterAdSlots(
      items,
      adSlotFilters({ q: ' READER ', availability: 'unavailable', type: 'NEWSLETTER' })
    )
  ).toEqual([slot]);
  expect(
    filterAdSlots(items, adSlotFilters({ availability: 'available' })).map((item) => item.id)
  ).toEqual(['2']);
});

it('sorts publisher prices numerically and names alphabetically', () => {
  const items = [slot, { ...slot, id: '2', name: 'Alpha', basePrice: '50.25' }];
  expect(filterAdSlots(items, adSlotFilters({})).map((item) => item.id)).toEqual(['1', '2']);
  expect(filterAdSlots(items, adSlotFilters({ sort: 'price-asc' })).map((item) => item.id)).toEqual(
    ['2', '1']
  );
  expect(filterAdSlots(items, adSlotFilters({ sort: 'name' })).map((item) => item.id)).toEqual([
    '2',
    '1',
  ]);
  expect(items[0]).toBe(slot);
});

it('uses safe defaults for invalid or repeated query values', () => {
  expect(campaignFilters({ q: ['a', 'b'], status: 'constructor', sort: 'invalid' })).toEqual({
    q: '',
    status: '',
    sort: 'newest',
  });
  expect(
    adSlotFilters({ availability: 'false', type: 'invalid', sort: ['name', 'price-asc'] })
  ).toEqual({ q: '', availability: '', type: '', sort: 'price-desc' });
});

it('renders all campaign statuses and caps overspent progress while keeping true amounts', () => {
  for (const status of Object.keys(campaignStatuses) as Campaign['status'][]) {
    expect(renderToStaticMarkup(<CampaignCard campaign={{ ...campaign, status }} />)).toContain(
      campaignStatuses[status]
    );
  }
  const html = renderToStaticMarkup(<CampaignCard campaign={campaign} />);
  expect(html).toContain('$100.50');
  expect(html).toContain('$120.75');
  expect(html).toContain('width:100%');
  expect(html).toContain('120');
  expect(renderToStaticMarkup(<CampaignCard campaign={{ ...campaign, budget: '0' }} />)).toContain(
    'width:0%'
  );
});

it('renders every ad format, cents, and accurate unavailable wording', () => {
  for (const type of Object.keys(adSlotTypes) as AdSlot['type'][]) {
    const html = renderToStaticMarkup(<AdSlotCard adSlot={{ ...slot, type }} />);
    expect(html).toContain(adSlotTypes[type]);
    expect(html).toContain('$250.75');
    expect(html).toContain('Unavailable');
    expect(html).not.toContain('Booked');
  }
});
