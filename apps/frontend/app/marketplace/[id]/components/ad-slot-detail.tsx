'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAdSlot } from '@/lib/api';
import { authClient } from '@/auth-client';
import type { AdSlot } from '@/lib/types';
import { formatPrice } from '@/lib/utils';
import { AdSlotFormat } from '@/app/components/ad-slot-format';

interface User {
  id: string;
  name: string;
  email: string;
}

interface RoleInfo {
  role: 'sponsor' | 'publisher' | null;
  sponsorId?: string;
  publisherId?: string;
  name?: string;
}

interface Props {
  id: string;
}

export function AdSlotDetail({ id }: Props) {
  const [adSlot, setAdSlot] = useState<AdSlot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roleInfo, setRoleInfo] = useState<RoleInfo | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [booking, setBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch ad slot
    getAdSlot(id)
      .then(setAdSlot)
      .catch(() => setError('Failed to load ad slot details'))
      .finally(() => setLoading(false));

    // Check user session and fetch role
    authClient
      .getSession()
      .then(({ data }) => {
        if (data?.user) {
          const sessionUser = data.user as User;
          setUser(sessionUser);

          // Fetch role info from backend
          fetch(
            `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4291'}/api/auth/role/${sessionUser.id}`,
            { credentials: 'include' }
          )
            .then((res) => res.json())
            .then((data) => setRoleInfo(data))
            .catch(() => setRoleInfo(null))
            .finally(() => setRoleLoading(false));
        } else {
          setRoleLoading(false);
        }
      })
      .catch(() => setRoleLoading(false));
  }, [id]);

  const handleBooking = async () => {
    if (!roleInfo?.sponsorId || !adSlot) return;

    setBooking(true);
    setBookingError(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4291'}/api/ad-slots/${adSlot.id}/book`,
        {
          credentials: 'include',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sponsorId: roleInfo.sponsorId,
            message: message || undefined,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to book placement');
      }

      setBookingSuccess(true);
      setAdSlot({ ...adSlot, isAvailable: false });
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : 'Failed to book placement');
    } finally {
      setBooking(false);
    }
  };

  const handleUnbook = async () => {
    if (!adSlot) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4291'}/api/ad-slots/${adSlot.id}/unbook`,
        {
          credentials: 'include',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to reset booking');
      }

      setBookingSuccess(false);
      setAdSlot({ ...adSlot, isAvailable: true });
      setMessage('');
    } catch (err) {
      console.error('Failed to unbook:', err);
    }
  };

  if (loading) {
    return (
      <div role="status" className="dashboard-muted py-12 text-center">
        Loading...
      </div>
    );
  }

  if (error || !adSlot) {
    return (
      <div className="space-y-4">
        <Link href="/marketplace" className="dashboard-text-button">
          ← Back to Marketplace
        </Link>
        <div role="alert" className="dashboard-form-error">
          {error || 'Ad slot not found'}
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
            {!adSlot.isAvailable && !bookingSuccess && (
              <button onClick={handleUnbook} className="dashboard-text-button ml-2">
                Reset listing
              </button>
            )}
          </div>
          <div className="text-right">
            <p className="dashboard-money">{formatPrice(Number(adSlot.basePrice))}</p>
            <p className="text-sm dashboard-muted">per month</p>
          </div>
        </div>

        {adSlot.isAvailable && !bookingSuccess && (
          <div className="marketplace-request">
            <h2 className="mb-4 text-xl font-semibold">Request This Placement</h2>

            {roleLoading ? (
              <div role="status" className="py-4 text-center dashboard-muted">
                Loading...
              </div>
            ) : roleInfo?.role === 'sponsor' && roleInfo?.sponsorId ? (
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium dashboard-muted">
                    Your Company
                  </label>
                  <p className="text-(--color-foreground)">{roleInfo.name || user?.name}</p>
                </div>
                <div>
                  <label
                    htmlFor="message"
                    className="mb-1 block text-sm font-medium dashboard-muted"
                  >
                    Message to Publisher (optional)
                  </label>
                  <textarea
                    id="message"
                    value={message}
                    disabled={booking}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell the publisher about your campaign goals..."
                    className="dashboard-input"
                    rows={3}
                  />
                </div>
                {bookingError && (
                  <p role="alert" className="dashboard-form-error">
                    {bookingError}
                  </p>
                )}
                <button
                  onClick={handleBooking}
                  disabled={booking}
                  className="dashboard-button dashboard-button-primary w-full"
                >
                  {booking ? 'Booking...' : 'Book This Placement'}
                </button>
              </div>
            ) : (
              <div>
                <button disabled className="dashboard-button w-full">
                  Request This Placement
                </button>
                <p className="mt-2 text-center text-sm dashboard-muted">
                  {user
                    ? 'Only sponsors can request placements'
                    : 'Log in as a sponsor to request this placement'}
                </p>
              </div>
            )}
          </div>
        )}

        {bookingSuccess && (
          <div role="status" className="marketplace-success">
            <h3 className="font-semibold">Placement Booked!</h3>
            <p className="mt-1 text-sm">
              Your request has been submitted. The publisher will be in touch soon.
            </p>
            <button onClick={handleUnbook} className="dashboard-text-button mt-3">
              Remove Booking (reset for testing)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
