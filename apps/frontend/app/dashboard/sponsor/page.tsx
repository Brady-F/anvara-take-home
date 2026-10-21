import { getSponsorCampaigns } from './actions';
import { CampaignList } from './components/campaign-list';
import { CampaignEditor } from './components/campaign-editor';
import { DashboardFeedback } from '../components/mutation-controls';

export default async function SponsorDashboard() {
  const campaigns = await getSponsorCampaigns();

  return (
    <DashboardFeedback>
      <div className="space-y-6">
        <div className="space-y-3">
          <h1 className="text-2xl font-bold">My Campaigns</h1>
          <CampaignEditor />
        </div>

        <CampaignList campaigns={campaigns} />
      </div>
    </DashboardFeedback>
  );
}
