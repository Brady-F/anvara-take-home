import { AdSlotGrid } from './components/ad-slot-grid';
import { DashboardHeading } from '../dashboard/components/dashboard-ui';

// FIXME: This page fetches all ad slots client-side. Consider:
// 1. Server-side pagination with searchParams
// 2. Filtering by category, price range, slot type
// 3. Search functionality

export default function MarketplacePage() {
  return (
    <div className="space-y-10">
      <DashboardHeading
        title="Marketplace"
        description="Explore ad placements and publisher details."
      />

      <AdSlotGrid />
    </div>
  );
}
