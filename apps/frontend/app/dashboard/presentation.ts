import type { AdSlot, Campaign } from '@/lib/types';

export const campaignStatuses: Record<Campaign['status'], string> = {
  DRAFT: 'Draft',
  PENDING_REVIEW: 'Pending review',
  APPROVED: 'Approved',
  ACTIVE: 'Active',
  PAUSED: 'Paused',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const adSlotTypes: Record<AdSlot['type'], string> = {
  DISPLAY: 'Display',
  VIDEO: 'Video',
  NATIVE: 'Native',
  NEWSLETTER: 'Newsletter',
  PODCAST: 'Podcast',
};

export const campaignSorts = {
  newest: 'Newest first',
  name: 'Name: A–Z',
  'budget-asc': 'Lowest budget',
  'budget-desc': 'Highest budget',
};
export const adSlotSorts = {
  'price-desc': 'Highest price',
  'price-asc': 'Lowest price',
  name: 'Name: A–Z',
};
export const availabilityOptions = { available: 'Available', unavailable: 'Unavailable' };

export type DashboardQuery = Record<string, string | string[] | undefined>;

function queryText(value: DashboardQuery[string]) {
  return typeof value === 'string' ? value.trim() : '';
}

function choice(value: DashboardQuery[string], options: Record<string, string>, fallback = '') {
  const text = queryText(value);
  return Object.hasOwn(options, text) ? text : fallback;
}

export function campaignFilters(query: DashboardQuery) {
  return {
    q: queryText(query.q),
    status: choice(query.status, campaignStatuses),
    sort: choice(query.sort, campaignSorts, 'newest'),
  };
}

export function adSlotFilters(query: DashboardQuery) {
  return {
    q: queryText(query.q),
    availability: choice(query.availability, availabilityOptions),
    type: choice(query.type, adSlotTypes),
    sort: choice(query.sort, adSlotSorts, 'price-desc'),
  };
}

// shortcut: filter the complete owned list; move filtering to paginated API queries if inventory grows.
export function filterCampaigns(items: Campaign[], filters: ReturnType<typeof campaignFilters>) {
  const result = items.filter(
    (item) =>
      item.name.toLowerCase().includes(filters.q.toLowerCase()) &&
      (!filters.status || item.status === filters.status)
  );
  if (filters.sort === 'name') result.sort((a, b) => a.name.localeCompare(b.name, 'en'));
  if (filters.sort === 'budget-asc') result.sort((a, b) => Number(a.budget) - Number(b.budget));
  if (filters.sort === 'budget-desc') result.sort((a, b) => Number(b.budget) - Number(a.budget));
  return result;
}

export function filterAdSlots(items: AdSlot[], filters: ReturnType<typeof adSlotFilters>) {
  const result = items.filter(
    (item) =>
      item.name.toLowerCase().includes(filters.q.toLowerCase()) &&
      (!filters.type || item.type === filters.type) &&
      (!filters.availability || item.isAvailable === (filters.availability === 'available'))
  );
  result.sort((a, b) => {
    if (filters.sort === 'name') return a.name.localeCompare(b.name, 'en');
    const difference = Number(a.basePrice) - Number(b.basePrice);
    return filters.sort === 'price-asc' ? difference : -difference;
  });
  return result;
}
