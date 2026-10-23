import type { Campaign } from '@/lib/types';
import { CampaignCard } from './campaign-card';
import { DashboardEmpty } from '../../components/dashboard-ui';
import { AnimatedGrid } from '../../components/animated-grid';

export function CampaignList({
  campaigns,
  filtered = false,
}: {
  campaigns: Campaign[];
  filtered?: boolean;
}) {
  return (
    <AnimatedGrid
      items={campaigns.map((campaign) => ({
        id: campaign.id,
        content: <CampaignCard campaign={campaign} />,
      }))}
      empty={
        <DashboardEmpty noun="campaigns" path="/dashboard/sponsor" filtered={filtered}>
          Create your first campaign to set a budget and plan your next sponsorship.
        </DashboardEmpty>
      }
    />
  );
}
