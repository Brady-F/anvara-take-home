'use client';

export default function SponsorError({ retry }: { retry: () => void }) {
  return (
    <div role="alert" className="rounded border border-red-200 bg-red-50 p-4 text-red-600">
      <p>Failed to load campaigns. Please try again.</p>
      <button type="button" onClick={() => retry()} className="mt-2 underline">
        Try again
      </button>
    </div>
  );
}
