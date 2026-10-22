import { formatPrice } from '@/lib/utils';
import { getSponsorCampaigns } from './actions';
import { CampaignList } from './components/campaign-list';
import { CampaignEditor } from './components/campaign-editor';
import { DashboardFeedback } from '../components/mutation-controls';
import {
  DashboardHeading,
  DashboardSummary,
  DashboardFilters,
  FilterSelect,
} from '../components/dashboard-ui';
import {
  campaignFilters,
  campaignSorts,
  campaignStatuses,
  filterCampaigns,
  type DashboardQuery,
} from '../presentation';

export default async function SponsorDashboard({
  searchParams,
}: {
  searchParams: Promise<DashboardQuery>;
}) {
  const [campaigns, query] = await Promise.all([getSponsorCampaigns(), searchParams]);
  const filters = campaignFilters(query);
  const visible = filterCampaigns(campaigns, filters);

  return (
    <DashboardFeedback>
      <DashboardHeading
        title="My Campaigns"
        description="Manage your sponsorship campaigns and budgets."
      >
        <CampaignEditor />
      </DashboardHeading>
      <DashboardSummary
        financial
        items={[
          {
            label: 'Active campaigns',
            value: campaigns.filter((item) => item.status === 'ACTIVE').length,
          },
          {
            label: 'Total budget',
            value: formatPrice(campaigns.reduce((sum, item) => sum + Number(item.budget), 0)),
          },
          {
            label: 'Total spent',
            value: formatPrice(campaigns.reduce((sum, item) => sum + Number(item.spent), 0)),
          },
        ]}
      />
      <DashboardFilters path="/dashboard/sponsor" query={filters.q}>
        <FilterSelect
          name="status"
          label="Status"
          value={filters.status}
          options={campaignStatuses}
          all="All statuses"
        />
        <FilterSelect name="sort" label="Sort by" value={filters.sort} options={campaignSorts} />
      </DashboardFilters>
      <div className="dashboard-results-heading">
        <h2>
          Your campaigns <span>{visible.length}</span>
        </h2>
        <p>
          {visible.length} of {campaigns.length} {campaigns.length === 1 ? 'campaign' : 'campaigns'}
        </p>
      </div>
      <CampaignList campaigns={visible} filtered={campaigns.length > 0} />
    </DashboardFeedback>
  );
}
