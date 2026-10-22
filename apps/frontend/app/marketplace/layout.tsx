import type { ReactNode } from 'react';

export default function MarketplaceLayout({ children }: { children: ReactNode }) {
  return <div className="app-surface">{children}</div>;
}
