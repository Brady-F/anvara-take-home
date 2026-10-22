import type { Campaign } from '@/lib/types';
import { CampaignCard } from './campaign-card';
import { DashboardEmpty } from '../../components/dashboard-ui';

export function CampaignList({
  campaigns,
  filtered = false,
}: {
  campaigns: Campaign[];
  filtered?: boolean;
}) {
  if (campaigns.length === 0) {
    return (
      <DashboardEmpty noun="campaigns" path="/dashboard/sponsor" filtered={filtered}>
        Create your first campaign to set a budget and plan your next sponsorship.
      </DashboardEmpty>
    );
  }
  return (
    <div className="dashboard-grid">
      {campaigns.map((campaign) => (
        <CampaignCard key={campaign.id} campaign={campaign} />
      ))}
    </div>
  );
}
