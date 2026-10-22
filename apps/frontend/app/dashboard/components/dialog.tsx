'use client';

import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react';

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

  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    dialog.querySelector<HTMLElement>('[data-autofocus], input, select, textarea')?.focus();
    // Revalidation can remove the edited card from the current filtered results.
    const restoreFocus = () => {
      const target = returnFocus.current;
      (target?.isConnected
        ? target
        : document.querySelector<HTMLElement>('[data-dashboard-create]')
      )?.focus();
    };
    return () => {
      dialog.close();
      restoreFocus();
    };
  }, [returnFocus]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-busy={pending}
      className={`dashboard-dialog${compact ? ' dashboard-dialog-compact' : ''}`}
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onClose();
      }}
    >
      <div className="dashboard-dialog-heading">
        <h2 id={titleId}>{title}</h2>
        <button
          type="button"
          className="dashboard-close"
          aria-label="Close dialog"
          disabled={pending}
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
    </dialog>
  );
}
