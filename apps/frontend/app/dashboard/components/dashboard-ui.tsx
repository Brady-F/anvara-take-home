import Form from 'next/form';
import { CardSkeleton, Skeleton } from '@/app/components/skeleton';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ApplyFilters } from './mutation-controls';

export function DashboardHeading({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="dashboard-heading">
      <div>
        <p className="dashboard-eyebrow">Your workspace</p>
        <h1>{title}</h1>
        <p className="dashboard-muted mt-2">{description}</p>
      </div>
      {children}
    </div>
  );
}

export function DashboardSummary({
  items,
  financial = false,
}: {
  items: { label: string; value: string | number }[];
  financial?: boolean;
}) {
  return (
    <dl
      className={`dashboard-summary${financial ? ' dashboard-summary-financial' : ''}`}
      aria-label="Account summary"
    >
      {items.map(({ label, value }) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function FilterSelect({
  name,
  label,
  value,
  options,
  all,
}: {
  name: string;
  label: string;
  value: string;
  options: Record<string, string>;
  all?: string;
}) {
  return (
    <label className="dashboard-filter-field">
      <span>{label}</span>
      <select key={value} name={name} defaultValue={value}>
        {all && <option value="">{all}</option>}
        {Object.entries(options).map(([key, text]) => (
          <option key={key} value={key}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

export function DashboardFilters({
  path,
  query,
  children,
}: {
  path: string;
  query: string;
  children: ReactNode;
}) {
  return (
    <Form action={path} scroll={false} className="dashboard-filters" aria-label="Filter items">
      <label className="dashboard-filter-field dashboard-search">
        <span>Search</span>
        <input
          key={query}
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search by name"
        />
      </label>
      {children}
      <ApplyFilters />
      <Link href={path} scroll={false} className="dashboard-text-button">
        Clear filters
      </Link>
    </Form>
  );
}

export function DashboardEmpty({
  filtered,
  noun,
  path,
  children,
}: {
  filtered: boolean;
  noun: string;
  path: string;
  children: ReactNode;
}) {
  return (
    <div className="dashboard-empty">
      <h2>{filtered ? `No matching ${noun}` : `No ${noun} yet.`}</h2>
      <p>{filtered ? 'Try a different name or clear your filters to see everything.' : children}</p>
      {filtered && (
        <Link className="dashboard-button" href={path}>
          Clear filters
        </Link>
      )}
    </div>
  );
}

export function DashboardLoading({ noun }: { noun: 'campaigns' | 'ad slots' }) {
  const campaign = noun === 'campaigns';
  return (
    <div className="dashboard-loading" role="status">
      <span className="sr-only">Loading {noun}...</span>
      <div aria-hidden="true">
        <DashboardHeading
          title={campaign ? 'My Campaigns' : 'My Ad Slots'}
          description={
            campaign
              ? 'Manage your sponsorship campaigns and budgets.'
              : 'Manage your inventory, pricing, and availability.'
          }
        >
          <Skeleton className="h-11 w-40 shrink-0" />
        </DashboardHeading>
        <dl className={`dashboard-summary${campaign ? ' dashboard-summary-financial' : ''}`}>
          {(campaign
            ? ['Active campaigns', 'Total budget', 'Total spent']
            : ['Total ad slots', 'Available', 'Unavailable']
          ).map((label) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>
                <Skeleton className={`h-[1.3em] ${campaign ? 'w-32' : 'w-12'}`} />
              </dd>
            </div>
          ))}
        </dl>
        <div className="dashboard-filters">
          <div className="dashboard-filter-field dashboard-search">
            <Skeleton className="h-[19.2px] w-12" />
            <Skeleton className="h-11 w-full" />
          </div>
          {(campaign ? ['w-44', 'w-40'] : ['w-36', 'w-36', 'w-40']).map((width, index) => (
            <div key={index} className={`dashboard-filter-field ${width} max-w-full`}>
              <Skeleton className="h-[19.2px] w-16" />
              <Skeleton className="h-11 w-full" />
            </div>
          ))}
          <Skeleton className="h-11 w-[72px]" />
          <Skeleton className="h-11 w-20" />
        </div>
        <div className="dashboard-results-heading">
          <Skeleton className="h-[29px] w-40" />
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="dashboard-grid">
          {[0, 1, 2].map((item) => (
            <CardSkeleton key={item} kind={campaign ? 'campaign' : 'ad-slot'} />
          ))}
        </div>
      </div>
    </div>
  );
}
