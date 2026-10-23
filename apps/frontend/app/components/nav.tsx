'use client';

import { PendingLabel, Skeleton } from '@/app/components/skeleton';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { authClient } from '@/auth-client';
import type { RoleData } from '@/lib/auth-helpers';

type UserRole = 'sponsor' | 'publisher' | null;

export function Nav() {
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState('');
  const [roleInfo, setRoleInfo] = useState<{ userId: string; role: UserRole } | null>(null);
  const role = roleInfo && roleInfo.userId === user?.id ? roleInfo.role : null;

  // TODO: Convert to server component and fetch role server-side
  // Fetch user role from backend when user is logged in
  useEffect(() => {
    if (user?.id) {
      const userId = user.id;
      fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4291'}/api/auth/role/${userId}`,
        { credentials: 'include' }
      )
        .then((res) => res.json())
        .then((data: RoleData) => setRoleInfo({ userId, role: data.role }))
        .catch(() => setRoleInfo({ userId, role: null }));
    }
  }, [user?.id]);

  const rolePending = Boolean(user && roleInfo?.userId !== user.id);
  const dashboardPath = role ? `/dashboard/${role}` : null;
  return (
    <header className="app-header">
      <nav className="app-nav" aria-label="Main navigation">
        <Link href="/" className="app-wordmark">
          Anvara
        </Link>
        <div className="app-nav-links">
          <Link
            href="/marketplace"
            aria-current={pathname.startsWith('/marketplace') ? 'page' : undefined}
          >
            Marketplace
          </Link>
          {(isPending || rolePending) && (
            <span className="flex items-center" role="status">
              <span className="sr-only">Loading navigation...</span>
              <Skeleton className="h-5 w-24" />
            </span>
          )}
          {user && dashboardPath && (
            <Link
              href={dashboardPath}
              aria-current={pathname === dashboardPath ? 'page' : undefined}
            >
              {role === 'sponsor' ? 'My Campaigns' : 'My Ad Slots'}
            </Link>
          )}
        </div>
        <div className="app-account">
          {isPending ? (
            <div className="flex items-center gap-3" role="status">
              <span className="sr-only">Loading account...</span>
              <div className="app-account-identity">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-1 ml-auto h-3 w-14" />
              </div>
              <Skeleton className="h-11 w-16" />
            </div>
          ) : user ? (
            <>
              <div className="app-account-identity">
                <span>{user.name}</span>
                <small>{rolePending ? <Skeleton className="mt-1 ml-auto h-4 w-14" /> : role}</small>
              </div>
              <button
                type="button"
                className="app-logout"
                disabled={signingOut}
                aria-busy={signingOut}
                onClick={async () => {
                  setSigningOut(true);
                  setError('');
                  try {
                    const result = await authClient.signOut();
                    if (result.error) throw new Error('Sign out failed');
                    window.location.href = '/';
                  } catch {
                    setError('Unable to log out. Please try again.');
                    setSigningOut(false);
                  }
                }}
              >
                <PendingLabel pending={signingOut} label="Logging out...">
                  Logout
                </PendingLabel>
              </button>
            </>
          ) : (
            <Link href="/login" className="dashboard-button dashboard-button-primary">
              Login
            </Link>
          )}
        </div>
      </nav>
      {error && (
        <p role="alert" className="app-nav-error">
          {error}
        </p>
      )}
    </header>
  );
}
