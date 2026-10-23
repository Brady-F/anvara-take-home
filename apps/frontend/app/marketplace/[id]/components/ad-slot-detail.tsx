'use client';

import { PendingLabel } from '@/app/components/skeleton';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError, getMarketplaceAdSlot } from '@/lib/api';
import { getUserRole, type RoleData } from '@/lib/auth-helpers';
import { authClient } from '@/auth-client';
import type { AdSlot } from '@/lib/types';
import { formatPrice } from '@/lib/utils';
import { AdSlotFormat } from '@/app/components/ad-slot-format';

import { AdSlotDetailSkeleton } from './ad-slot-detail-skeleton';

interface Props {
  id: string;
}

export function AdSlotDetail({ id }: Props) {
  const [adSlot, setAdSlot] = useState<AdSlot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<number | null>(null);
  const [roleInfo, setRoleInfo] = useState<RoleData | null>(null);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState('');

  useEffect(() => {
    getMarketplaceAdSlot(id)
      .then(setAdSlot)
      .catch((err) => setError(err instanceof ApiError ? err.status : 500))
      .finally(() => setLoading(false));

    authClient
      .getSession()
      .then(({ data }) => (data?.user ? getUserRole(data.user.id) : null))
      .then(setRoleInfo)
      .catch(() => setRoleInfo(null));
  }, [id]);

  const handleUnbook = async () => {
    if (!adSlot || roleInfo?.role !== 'publisher' || roleInfo.publisherId !== adSlot.publisherId)
      return;
    setResetting(true);
    setResetError('');
    try {
      const result = await api<{ adSlot: AdSlot }>(`/api/ad-slots/${adSlot.id}/unbook`, {
        method: 'POST',
      });
      setAdSlot(result.adSlot);
    } catch {
      setResetError('Unable to reset listing. Please try again.');
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return <AdSlotDetailSkeleton />;
  }

  if (error || !adSlot) {
    return (
      <div className="space-y-4">
        <Link href="/marketplace" className="dashboard-text-button">
          ← Back to Marketplace
        </Link>
        <div role="alert" className="dashboard-form-error">
          {error === 401
            ? 'Sign in to view this placement.'
            : error === 403
              ? 'Use a sponsor or publisher account to view this placement.'
              : error === 404
                ? 'Ad slot not found'
                : 'Failed to load ad slot details'}
          {error === 401 && (
            <Link href="/login" className="dashboard-text-button ml-2">
              Sign in
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="marketplace-detail">
      <Link href="/marketplace" className="dashboard-text-button">
        ← Back to Marketplace
      </Link>

      <div className="marketplace-detail-panel">
        <div className="marketplace-detail-heading">
          <div>
            <h1>{adSlot.name}</h1>
            {adSlot.publisher && (
              <p className="dashboard-muted">
                by {adSlot.publisher.name}
                {adSlot.publisher.website && (
                  <>
                    {' '}
                    ·{' '}
                    <a
                      href={adSlot.publisher.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="dashboard-text-button"
                    >
                      {adSlot.publisher.website}
                    </a>
                  </>
                )}
              </p>
            )}
          </div>
          <AdSlotFormat type={adSlot.type} />
        </div>

        {adSlot.description && (
          <p className="marketplace-detail-description">{adSlot.description}</p>
        )}

        <div className="marketplace-detail-price">
          <div>
            <span
              className={`dashboard-status dashboard-status-${adSlot.isAvailable ? 'green' : 'neutral'}`}
            >
              <span aria-hidden="true" />
              {adSlot.isAvailable ? 'Available' : 'Unavailable'}
            </span>
            {!adSlot.isAvailable &&
              roleInfo?.role === 'publisher' &&
              roleInfo.publisherId === adSlot.publisherId && (
                <button
                  onClick={handleUnbook}
                  disabled={resetting}
                  aria-busy={resetting}
                  className="dashboard-text-button ml-2"
                >
                  <PendingLabel pending={resetting} label="Resetting...">
                    Reset listing
                  </PendingLabel>
                </button>
              )}
          </div>
          <div className="text-right">
            <p className="dashboard-money">{formatPrice(Number(adSlot.basePrice))}</p>
            <p className="text-sm dashboard-muted">per month</p>
          </div>
        </div>

        {resetError && (
          <p role="alert" className="dashboard-form-error">
            {resetError}
          </p>
        )}
        <p className="dashboard-muted">Browse placements here. Booking is not available.</p>
      </div>
    </div>
  );
}
