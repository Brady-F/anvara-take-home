// API response types: Prisma Decimal values serialize to strings, dates to ISO strings.

export type UserRole = 'sponsor' | 'publisher';

export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  budget: string;
  spent: string;
  status: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  startDate: string;
  endDate: string;
  sponsorId: string;
  sponsor?: { id: string; name: string };
}

export interface AdSlot {
  id: string;
  name: string;
  description: string | null;
  type: 'DISPLAY' | 'VIDEO' | 'NATIVE' | 'NEWSLETTER' | 'PODCAST';
  basePrice: string;
  isAvailable: boolean;
  publisherId: string;
  publisher?: { id: string; name: string; website?: string | null };
}

export interface Placement {
  id: string;
  impressions: number;
  clicks: number;
  status: 'PENDING' | 'APPROVED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'REJECTED';
  campaignId: string;
  adSlotId: string;
}

export interface CreateCampaignInput {
  name: string;
  description?: string | null;
  budget: number;
  cpmRate?: number | null;
  cpcRate?: number | null;
  startDate: string;
  endDate: string;
  targetCategories?: string[];
  targetRegions?: string[];
  sponsorId: string;
}

export interface CreateAdSlotInput {
  name: string;
  description?: string | null;
  type: AdSlot['type'];
  basePrice: number;
  publisherId: string;
}

export interface CreatePlacementInput {
  campaignId: string;
  creativeId: string;
  adSlotId: string;
  publisherId: string;
  agreedPrice: number;
  pricingModel?: 'CPM' | 'CPC' | 'CPA' | 'FLAT_RATE';
  startDate: string;
  endDate: string;
}

export interface DashboardStats {
  sponsors: number;
  publishers: number;
  activeCampaigns: number;
  totalPlacements: number;
  metrics: {
    totalImpressions: number;
    totalClicks: number;
    totalConversions: number;
    avgCtr: string | number;
  };
}
