import { getPublisherAdSlots } from './actions';
import { AdSlotList } from './components/ad-slot-list';
import { AdSlotEditor } from './components/ad-slot-editor';
import { DashboardFeedback } from '../components/mutation-controls';

export default async function PublisherDashboard() {
  const adSlots = await getPublisherAdSlots();

  return (
    <DashboardFeedback>
      <div className="space-y-6">
        <div className="space-y-3">
          <h1 className="text-2xl font-bold">My Ad Slots</h1>
          <AdSlotEditor />
        </div>

        <AdSlotList adSlots={adSlots} />
      </div>
    </DashboardFeedback>
  );
}
