import type { AdSlot } from '@/lib/types';
import { formatPrice } from '@/lib/utils';
import { AdSlotFormat } from '@/app/components/ad-slot-format';
import { AdSlotEditor } from './ad-slot-editor';

export function AdSlotCard({ adSlot }: { adSlot: AdSlot }) {
  return (
    <article className="dashboard-card">
      <div className="dashboard-card-heading">
        <AdSlotFormat type={adSlot.type} />
        <span
          className={`dashboard-status dashboard-status-${adSlot.isAvailable ? 'green' : 'neutral'}`}
        >
          <span aria-hidden="true" />
          {adSlot.isAvailable ? 'Available' : 'Unavailable'}
        </span>
      </div>
      <h3>{adSlot.name}</h3>
      <p className="dashboard-card-description">{adSlot.description || 'No description added.'}</p>
      <div className="dashboard-card-details">
        <p className="dashboard-money-label">Base price</p>
        <p className="dashboard-money">
          {formatPrice(Number(adSlot.basePrice))}
          <span> / month</span>
        </p>
      </div>
      <AdSlotEditor adSlot={adSlot} />
    </article>
  );
}
