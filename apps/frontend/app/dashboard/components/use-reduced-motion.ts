'use client';

import { useSyncExternalStore } from 'react';

const query = '(prefers-reduced-motion: reduce)';

function subscribe(onChange: () => void) {
  const media = window.matchMedia?.(query);
  media?.addEventListener('change', onChange);
  return () => media?.removeEventListener('change', onChange);
}

// Motion's hook captures only the initial preference; listen for changes during a session too.
export function useReducedMotion() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia?.(query).matches ?? false,
    () => true
  );
}
