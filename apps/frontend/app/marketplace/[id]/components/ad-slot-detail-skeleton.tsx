import Link from 'next/link';
import { Skeleton } from '@/app/components/skeleton';

export function AdSlotDetailSkeleton() {
  return (
    <div className="marketplace-detail">
      <Link href="/marketplace" className="dashboard-text-button">
        ← Back to Marketplace
      </Link>
      <div className="marketplace-detail-panel" role="status">
        <span className="sr-only">Loading placement details...</span>
        <div aria-hidden="true">
          <div className="marketplace-detail-heading">
            <div>
              <h1>
                <Skeleton className="h-[1.2em] w-3/4" />
              </h1>
              <p>
                <Skeleton className="h-6 w-1/2" />
              </p>
            </div>
            <Skeleton className="h-5 w-24" />
          </div>
          <div className="marketplace-detail-description space-y-2">
            <Skeleton className="h-[1.4em] w-full" />
            <Skeleton className="h-[1.4em] w-4/5" />
          </div>
          <div className="marketplace-detail-price">
            <Skeleton className="h-6 w-24" />
            <div>
              <div className="dashboard-money">
                <Skeleton className="h-[1.35em] w-32" />
              </div>
              <Skeleton className="my-[3.2px] ml-auto h-4 w-20" />
            </div>
          </div>
          <Skeleton className="my-1 h-4 w-80" />
        </div>
      </div>
    </div>
  );
}
