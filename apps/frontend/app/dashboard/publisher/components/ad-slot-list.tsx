import type { AdSlot } from '@/lib/types';
import { AdSlotCard } from './ad-slot-card';
import { DashboardEmpty } from '../../components/dashboard-ui';

export function AdSlotList({
  adSlots,
  filtered = false,
}: {
  adSlots: AdSlot[];
  filtered?: boolean;
}) {
  if (adSlots.length === 0) {
    return (
      <DashboardEmpty noun="ad slots" path="/dashboard/publisher" filtered={filtered}>
        Create your first ad slot to set your price and make space for your next sponsor.
      </DashboardEmpty>
    );
  }
  return (
    <div className="dashboard-grid">
      {adSlots.map((slot) => (
        <AdSlotCard key={slot.id} adSlot={slot} />
      ))}
    </div>
  );
}
