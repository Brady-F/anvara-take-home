import { getSponsorCampaigns } from './actions';
import { CampaignList } from './components/campaign-list';

export default async function SponsorDashboard() {
  const campaigns = await getSponsorCampaigns();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Campaigns</h1>
        {/* TODO: Add CreateCampaignButton here */}
      </div>

      <CampaignList campaigns={campaigns} />
    </div>
  );
}
