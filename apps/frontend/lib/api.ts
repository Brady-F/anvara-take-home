// Simple API client

import type {
  AdSlot,
  Campaign,
  CreateAdSlotInput,
  CreateCampaignInput,
  CreatePlacementInput,
  DashboardStats,
  Placement,
} from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4291';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

export async function api<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    credentials: 'include',
    cache: 'no-store',
    headers,
  });
  if (!res.ok) {
    const body: unknown = await res.json().catch(() => null);
    const message =
      res.status < 500 &&
      body &&
      typeof body === 'object' &&
      'error' in body &&
      typeof body.error === 'string'
        ? body.error
        : 'API request failed';
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// Campaigns
export const getCampaigns = (sponsorId?: string, options?: RequestInit) =>
  api<Campaign[]>(sponsorId ? `/api/campaigns?sponsorId=${sponsorId}` : '/api/campaigns', options);
export const getCampaign = (id: string) => api<Campaign>(`/api/campaigns/${id}`);
export const createCampaign = (data: CreateCampaignInput) =>
  api<Campaign>('/api/campaigns', { method: 'POST', body: JSON.stringify(data) });

// Ad Slots
export const getAdSlots = (publisherId?: string, options?: RequestInit) =>
  api<AdSlot[]>(
    publisherId ? `/api/ad-slots?publisherId=${publisherId}` : '/api/ad-slots',
    options
  );
export const createAdSlot = (data: CreateAdSlotInput) =>
  api<AdSlot>('/api/ad-slots', { method: 'POST', body: JSON.stringify(data) });

// Read-only marketplace; publisher management continues to use /api/ad-slots.
export const getMarketplaceAdSlots = () => api<AdSlot[]>('/api/marketplace/ad-slots');
export const getMarketplaceAdSlot = (id: string) =>
  api<AdSlot>(`/api/marketplace/ad-slots/${encodeURIComponent(id)}`);

// Placements
export const getPlacements = () => api<Placement[]>('/api/placements');
export const createPlacement = (data: CreatePlacementInput) =>
  api<Placement>('/api/placements', { method: 'POST', body: JSON.stringify(data) });

// Dashboard
export const getStats = () => api<DashboardStats>('/api/dashboard/stats');
