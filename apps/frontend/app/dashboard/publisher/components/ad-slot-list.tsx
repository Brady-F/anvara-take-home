import type { AdSlot } from '@/lib/types';
import { AdSlotCard } from './ad-slot-card';
import { DashboardEmpty } from '../../components/dashboard-ui';
import { AnimatedGrid } from '../../components/animated-grid';

export function AdSlotList({
  adSlots,
  filtered = false,
}: {
  adSlots: AdSlot[];
  filtered?: boolean;
}) {
  return (
    <AnimatedGrid
      items={adSlots.map((slot) => ({ id: slot.id, content: <AdSlotCard adSlot={slot} /> }))}
      empty={
        <DashboardEmpty noun="ad slots" path="/dashboard/publisher" filtered={filtered}>
          Create your first ad slot to set your price and make space for your next sponsor.
        </DashboardEmpty>
      }
    />
  );
}
