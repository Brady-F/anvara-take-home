import { getPublisherAdSlots } from './actions';
import { AdSlotList } from './components/ad-slot-list';
import { AdSlotEditor } from './components/ad-slot-editor';
import { DashboardFeedback } from '../components/mutation-controls';
import {
  DashboardHeading,
  DashboardSummary,
  DashboardFilters,
  FilterSelect,
} from '../components/dashboard-ui';
import {
  adSlotFilters,
  adSlotSorts,
  adSlotTypes,
  availabilityOptions,
  filterAdSlots,
  type DashboardQuery,
} from '../presentation';

export default async function PublisherDashboard({
  searchParams,
}: {
  searchParams: Promise<DashboardQuery>;
}) {
  const [adSlots, query] = await Promise.all([getPublisherAdSlots(), searchParams]);
  const filters = adSlotFilters(query);
  const visible = filterAdSlots(adSlots, filters);
  const available = adSlots.filter((item) => item.isAvailable).length;

  return (
    <DashboardFeedback>
      <DashboardHeading
        title="My Ad Slots"
        description="Manage your inventory, pricing, and availability."
      >
        <AdSlotEditor />
      </DashboardHeading>
      <DashboardSummary
        items={[
          { label: 'Total ad slots', value: adSlots.length },
          { label: 'Available', value: available },
          { label: 'Unavailable', value: adSlots.length - available },
        ]}
      />
      <DashboardFilters path="/dashboard/publisher" query={filters.q}>
        <FilterSelect
          name="availability"
          label="Availability"
          value={filters.availability}
          options={availabilityOptions}
          all="All availability"
        />
        <FilterSelect
          name="type"
          label="Format"
          value={filters.type}
          options={adSlotTypes}
          all="All formats"
        />
        <FilterSelect name="sort" label="Sort by" value={filters.sort} options={adSlotSorts} />
      </DashboardFilters>
      <div className="dashboard-results-heading">
        <h2>
          Your inventory <span>{visible.length}</span>
        </h2>
        <p>
          {visible.length} of {adSlots.length} {adSlots.length === 1 ? 'ad slot' : 'ad slots'}
        </p>
      </div>
      <AdSlotList adSlots={visible} filtered={adSlots.length > 0} />
    </DashboardFeedback>
  );
}
