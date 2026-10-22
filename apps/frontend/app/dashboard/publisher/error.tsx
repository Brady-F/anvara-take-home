'use client';

export default function Error({ retry }: { retry: () => void }) {
  return (
    <div role="alert" className="dashboard-empty dashboard-error">
      <h1>We couldn’t load your ad slots.</h1>
      <p>Failed to load ad slots. Please try again.</p>
      <button type="button" onClick={() => retry()} className="dashboard-button">
        Try again
      </button>
    </div>
  );
}
