'use client';

import { forwardRef, type ReactNode } from 'react';
import { AnimatePresence, motion, useIsPresent } from 'motion/react';
import { useReducedMotion } from './use-reduced-motion';
import { restoreDashboardFocus } from './dialog';

const GridItem = forwardRef<HTMLDivElement, { children: ReactNode; empty?: boolean }>(
  function GridItem({ children, empty }, ref) {
    const present = useIsPresent();
    const reduced = useReducedMotion();
    return (
      <motion.div
        ref={ref}
        className={`dashboard-grid-item${empty ? ' dashboard-grid-empty' : ''}`}
        inert={!present}
        data-exiting={!present || undefined}
        layout={reduced ? false : 'position'}
        initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, transition: { duration: reduced ? 0 : 0.15 } }}
        transition={{
          duration: reduced ? 0 : 0.2,
          ease: 'easeOut',
          layout: { duration: reduced ? 0 : 0.22, ease: 'easeOut' },
        }}
      >
        {children}
      </motion.div>
    );
  }
);

export function AnimatedGrid({
  items,
  empty,
}: {
  items: { id: string; content: ReactNode }[];
  empty: ReactNode;
}) {
  return (
    <div className="dashboard-grid dashboard-animated-grid">
      <AnimatePresence
        initial={false}
        mode="popLayout"
        onExitComplete={() => {
          // Revalidation can remove a trigger after its dialog has already restored focus to it.
          requestAnimationFrame(() => {
            if (document.activeElement === document.body) restoreDashboardFocus(null);
          });
        }}
      >
        {items.length ? (
          items.map(({ id, content }) => <GridItem key={id}>{content}</GridItem>)
        ) : (
          <GridItem key="empty" empty>
            {empty}
          </GridItem>
        )}
      </AnimatePresence>
    </div>
  );
}
