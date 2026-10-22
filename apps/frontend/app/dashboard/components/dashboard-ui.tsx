import Form from 'next/form';
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

export function DashboardLoading({ noun }: { noun: string }) {
  return (
    <div className="dashboard-loading" role="status">
      <span className="sr-only">Loading {noun}...</span>
      <div aria-hidden="true">
        <div className="dashboard-skeleton h-5 w-28" />
        <div className="dashboard-skeleton mt-4 h-10 w-64 max-w-full" />
        <div className="dashboard-skeleton my-10 h-24" />
        <div className="dashboard-skeleton mb-6 h-16" />
        <div className="dashboard-grid">
          {[0, 1, 2].map((item) => (
            <div key={item} className="dashboard-skeleton h-80" />
          ))}
        </div>
      </div>
    </div>
  );
}
