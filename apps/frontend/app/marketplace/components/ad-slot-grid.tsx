'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ApiError, getMarketplaceAdSlots } from '@/lib/api';
import type { AdSlot } from '@/lib/types';
import { formatPrice } from '@/lib/utils';
import { AdSlotFormat } from '@/app/components/ad-slot-format';

export function AdSlotGrid() {
  const [adSlots, setAdSlots] = useState<AdSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<number | null>(null);

  useEffect(() => {
    getMarketplaceAdSlots()
      .then(setAdSlots)
      .catch((err) => setError(err instanceof ApiError ? err.status : 500))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div role="status">
        <span className="sr-only">Loading marketplace...</span>
        <div className="dashboard-grid" aria-hidden="true">
          {[0, 1, 2].map((item) => (
            <div key={item} className="dashboard-skeleton h-80" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="dashboard-empty">
        <h2>
          {error === 401
            ? 'Sign in to browse the marketplace.'
            : 'We couldn’t load the marketplace.'}
        </h2>
        <p>
          {error === 401 || error === 403
            ? 'Use a sponsor or publisher account to view ad placements.'
            : 'Failed to load ad slots. Please try again.'}
        </p>
        {error === 401 ? (
          <Link href="/login" className="dashboard-button">
            Sign in
          </Link>
        ) : error !== 403 ? (
          <button
            type="button"
            className="dashboard-button"
            onClick={() => window.location.reload()}
          >
            Try again
          </button>
        ) : null}
      </div>
    );
  }

  if (adSlots.length === 0) {
    return (
      <div className="dashboard-empty">
        <h2>No ad slots yet.</h2>
        <p>Publisher listings will appear here once they’re added.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="dashboard-results-heading">
        <h2>
          Ad placements <span>{adSlots.length}</span>
        </h2>
      </div>
      <div className="dashboard-grid">
        {adSlots.map((slot) => (
          <Link
            key={slot.id}
            href={`/marketplace/${slot.id}`}
            className="dashboard-card marketplace-card"
          >
            <div className="dashboard-card-heading">
              <AdSlotFormat type={slot.type} />
              <span
                className={`dashboard-status dashboard-status-${slot.isAvailable ? 'green' : 'neutral'}`}
              >
                <span aria-hidden="true" />
                {slot.isAvailable ? 'Available' : 'Unavailable'}
              </span>
            </div>

            <h3>{slot.name}</h3>
            {slot.publisher && (
              <p className="dashboard-muted mt-1 text-sm">by {slot.publisher.name}</p>
            )}

            <p className="dashboard-card-description">
              {slot.description || 'No description added.'}
            </p>

            <div className="dashboard-card-details">
              <p className="dashboard-money-label">Base price</p>
              <p className="dashboard-money">
                {formatPrice(Number(slot.basePrice))}
                <span> / month</span>
              </p>
            </div>
            <div className="marketplace-card-footer">
              View placement <span aria-hidden="true">↗</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
