export function Skeleton({ className = '' }: { className?: string }) {
  return <span aria-hidden="true" className={`dashboard-skeleton ${className}`} />;
}

export function PendingLabel({
  pending,
  label,
  children,
}: {
  pending: boolean;
  label: string;
  children: string;
}) {
  return (
    <span className="pending-label">
      <span className={pending ? 'invisible' : undefined} aria-hidden={pending || undefined}>
        {children}
      </span>
      {pending && (
        <>
          <Skeleton className="pending-label-skeleton" />
          <span className="sr-only">{label}</span>
        </>
      )}
    </span>
  );
}

export function CardSkeleton({ kind }: { kind: 'campaign' | 'ad-slot' | 'marketplace' }) {
  return (
    <div className="dashboard-card" aria-hidden="true">
      <div className="dashboard-card-heading">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-5 w-20" />
      </div>
      <h3>
        <Skeleton className="h-[1.35em] w-3/4" />
      </h3>
      {kind === 'marketplace' && <Skeleton className="mt-1 h-5 w-1/2" />}
      <div className="dashboard-card-description space-y-2">
        <Skeleton className="h-[1.2em] w-full" />
        <Skeleton className="h-[1.2em] w-4/5" />
      </div>
      <div className="dashboard-card-details">
        <div className="dashboard-money-label">
          <Skeleton className="h-[1.6em] w-24" />
        </div>
        <div className="dashboard-money">
          <Skeleton className="h-[1.35em] w-40" />
        </div>
        {kind === 'campaign' && (
          <>
            <div className="dashboard-spending">
              <Skeleton className="h-[1.6em] w-24" />
              <Skeleton className="h-[1.6em] w-16" />
            </div>
            <Skeleton className="mt-2 h-1 w-full" />
            <div className="dashboard-dates">
              <Skeleton className="h-[1.6em] w-4/5" />
            </div>
          </>
        )}
      </div>
      <div
        className={kind === 'marketplace' ? 'marketplace-card-footer' : 'dashboard-card-actions'}
      >
        <Skeleton className={kind === 'marketplace' ? 'h-[1.6em] w-28' : 'h-11 w-16'} />
        <Skeleton className={kind === 'marketplace' ? 'h-4 w-4' : 'h-5 w-12'} />
      </div>
    </div>
  );
}
