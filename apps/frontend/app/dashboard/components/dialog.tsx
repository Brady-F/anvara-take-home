'use client';

import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react';
import { motion, useIsPresent } from 'motion/react';
import { useReducedMotion } from './use-reduced-motion';

export function restoreDashboardFocus(target: HTMLElement | null) {
  (target?.isConnected && !target.closest('[inert]') && !target.matches(':disabled')
    ? target
    : document.querySelector<HTMLElement>('[data-dashboard-create]')
  )?.focus();
}

export function Dialog({
  title,
  pending,
  onClose,
  returnFocus,
  compact = false,
  children,
}: {
  title: string;
  pending: boolean;
  onClose: () => void;
  returnFocus: RefObject<HTMLElement | null>;
  compact?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const present = useIsPresent();
  const reduced = useReducedMotion();

  useEffect(() => {
    const dialog = ref.current!;
    const target = returnFocus.current;
    dialog.showModal();
    dialog.querySelector<HTMLElement>('[data-autofocus], input, select, textarea')?.focus();
    return () => {
      dialog.close();
      // The owning card may disappear before its controls can restore focus.
      if (!target?.isConnected || target.closest('[inert]')) {
        requestAnimationFrame(() => restoreDashboardFocus(null));
      }
    };
  }, [returnFocus]);

  return (
    <motion.dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-busy={pending}
      data-exiting={!present || undefined}
      initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 'var(--dialog-offset)' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{
        opacity: 0,
        y: reduced ? 0 : 'var(--dialog-offset)',
        transition: { duration: reduced ? 0 : 0.14 },
      }}
      transition={{ duration: reduced ? 0 : 0.18, ease: 'easeOut' }}
      className={`dashboard-dialog${compact ? ' dashboard-dialog-compact' : ''}`}
      onCancel={(event) => {
        event.preventDefault();
        if (!pending && present) onClose();
      }}
    >
      <div className="dashboard-dialog-heading">
        <h2 id={titleId}>{title}</h2>
        <button
          type="button"
          className="dashboard-close"
          aria-label="Close dialog"
          disabled={pending || !present}
          onClick={onClose}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            aria-hidden="true"
          >
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
      {children}
    </motion.dialog>
  );
}
