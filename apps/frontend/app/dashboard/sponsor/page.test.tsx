// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Campaign } from '@/lib/types';
import { getSponsorCampaigns } from './actions';
import SponsorDashboard from './page';
import SponsorLoading from './loading';
import SponsorError from './error';

vi.mock('./actions', () => ({
  getSponsorCampaigns: vi.fn(),
  createCampaign: vi.fn(),
  updateCampaign: vi.fn(),
  deleteCampaign: vi.fn(),
}));

const campaign: Campaign = {
  id: 'campaign-1',
  sponsorId: 'sponsor-1',
  name: 'Summer launch',
  description: 'Reach new readers',
  budget: '1000.00',
  spent: '250.00',
  status: 'ACTIVE',
  startDate: '2026-06-01T00:00:00.000Z',
  endDate: '2026-07-01T00:00:00.000Z',
};

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  vi.unstubAllEnvs();
});

describe('sponsor dashboard rendering', () => {
  it('includes campaign data in server-rendered HTML', async () => {
    vi.mocked(getSponsorCampaigns).mockResolvedValue([campaign]);

    const html = renderToStaticMarkup(await SponsorDashboard());

    expect(html).toContain('My Campaigns');
    expect(html).toContain('Summer launch');
    expect(html).toContain('Reach new readers');
    expect(html).toContain('ACTIVE');
    expect(html).toContain('$250 / $1,000');
    expect(html).toContain('width:25%');
  });

  it('keeps midnight UTC campaign dates on the correct day on a New York server', async () => {
    vi.stubEnv('TZ', 'America/New_York');
    vi.mocked(getSponsorCampaigns).mockResolvedValue([campaign]);

    const html = renderToStaticMarkup(await SponsorDashboard());

    expect(html).toContain('6/1/2026 - 7/1/2026');
  });

  it('keeps the empty state when no campaigns exist', async () => {
    vi.mocked(getSponsorCampaigns).mockResolvedValue([]);

    expect(renderToStaticMarkup(await SponsorDashboard())).toContain('No campaigns yet.');
  });

  it('announces loading while the route is pending', () => {
    render(<SponsorLoading />);

    expect(screen.getByRole('status').textContent).toBe('Loading campaigns...');
  });

  it('shows a safe error message and retries through the route boundary', () => {
    const retry = vi.fn();
    render(<SponsorError retry={retry} />);

    expect(screen.getByRole('alert').textContent).toContain('Failed to load campaigns');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
