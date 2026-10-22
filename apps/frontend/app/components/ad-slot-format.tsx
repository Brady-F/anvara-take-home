import type { AdSlot } from '@/lib/types';
import { adSlotTypes } from '../dashboard/presentation';

const formatIcons: Record<AdSlot['type'], string> = {
  DISPLAY: 'M3 5h18v14H3z M3 9h18',
  VIDEO: 'M3 5h18v14H3z m7 4 6 3-6 3z',
  NATIVE: 'M4 4h16v16H4z M8 8h8 M8 12h8 M8 16h4',
  NEWSLETTER: 'M3 5h18v14H3z m0 0 9 8 9-8',
  PODCAST: 'M9 5a3 3 0 0 1 6 0v6a3 3 0 0 1-6 0z M5 10v1a7 7 0 0 0 14 0v-1 M12 18v4 M8 22h8',
};

export function AdSlotFormat({ type }: { type: AdSlot['type'] }) {
  return (
    <span className="dashboard-format">
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d={formatIcons[type]} />
      </svg>
      {adSlotTypes[type]}
    </span>
  );
}
