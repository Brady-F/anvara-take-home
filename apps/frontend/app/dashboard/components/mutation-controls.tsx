'use client';

import {
  createContext,
  useActionState,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { useFormStatus } from 'react-dom';
import type { FormAction, FormState } from '../form-state';
import { Dialog } from './dialog';

const FeedbackContext = createContext<(message: string) => void>(() => {});

export function ApplyFilters() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="dashboard-button" disabled={pending}>
      {pending ? 'Applying...' : 'Apply'}
    </button>
  );
}

export function DashboardFeedback({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('');
  useEffect(() => {
    // A later server refresh may remove the card that received focus when its dialog closed.
    if (message && document.activeElement === document.body) {
      document.querySelector<HTMLElement>('[data-dashboard-create]')?.focus();
    }
  }, [children, message]);
  return (
    <FeedbackContext value={setMessage}>
      {children}
      <div className="dashboard-feedback" role="status">
        {message && (
          <div className="dashboard-notice">
            <span>{message}</span>
            <button
              type="button"
              className="dashboard-text-button"
              onClick={() => setMessage('')}
              aria-label="Dismiss notification"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    </FeedbackContext>
  );
}

function FormContents({
  children,
  deleting,
  cancel,
}: {
  children: ReactNode;
  deleting: boolean;
  cancel: () => void;
}) {
  const { pending } = useFormStatus();
  return (
    <fieldset disabled={pending} className="min-w-0">
      <div className="dashboard-form-fields">{children}</div>
      <div className="dashboard-form-footer">
        <button
          type="button"
          disabled={pending}
          onClick={cancel}
          className="dashboard-button"
          data-autofocus={deleting || undefined}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className={`dashboard-button ${deleting ? 'dashboard-button-danger' : 'dashboard-button-primary'}`}
        >
          {pending ? (deleting ? 'Deleting...' : 'Saving...') : deleting ? 'Delete' : 'Save'}
        </button>
      </div>
    </fieldset>
  );
}

function ActionForm({
  action,
  children,
  onSuccess,
  cancel,
  label,
  returnFocus,
  deleting = false,
}: {
  action: FormAction;
  children: (state: FormState) => ReactNode;
  onSuccess: () => void;
  cancel: () => void;
  label: string;
  returnFocus: RefObject<HTMLElement | null>;
  deleting?: boolean;
}) {
  const form = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    async (previous: FormState, data: FormData) => {
      try {
        const result = await action(previous, data);
        if (result.success) onSuccess();
        return result;
      } catch {
        return {
          error: deleting
            ? 'Unable to delete this item. Please try again.'
            : 'Unable to save your changes. Please try again.',
        };
      }
    },
    {}
  );

  useEffect(() => {
    form.current?.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]')?.focus();
  }, [state]);

  return (
    <Dialog
      title={label}
      pending={pending}
      onClose={cancel}
      returnFocus={returnFocus}
      compact={deleting}
    >
      <form ref={form} action={formAction} aria-label={label} noValidate>
        <FormContents deleting={deleting} cancel={cancel}>
          {children(state)}
          {state.fieldErrors && (
            <p role="alert" tabIndex={-1} className="dashboard-form-error">
              Please correct the highlighted fields.
            </p>
          )}
          {state.error && (
            <p role="alert" tabIndex={-1} className="dashboard-form-error">
              {state.error}
            </p>
          )}
        </FormContents>
      </form>
    </Dialog>
  );
}

export function MutationControls({
  action,
  deleteAction,
  label,
  itemName,
  itemTitle,
  children,
}: {
  action: FormAction;
  deleteAction?: FormAction;
  label: string;
  itemName: string;
  itemTitle?: string;
  children: (state: FormState) => ReactNode;
}) {
  // shortcut: forms need JavaScript; use native disclosures and direct actions if no-script access is required.
  const [view, setView] = useState<'edit' | 'delete' | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const report = useContext(FeedbackContext);
  const close = () => setView(null);
  return (
    <div className={deleteAction ? 'dashboard-card-actions' : ''}>
      <button
        type="button"
        data-dashboard-create={!deleteAction || undefined}
        disabled={view !== null}
        onClick={(event) => {
          returnFocus.current = event.currentTarget;
          report('');
          setView('edit');
        }}
        aria-haspopup="dialog"
        className={`dashboard-button ${deleteAction ? '' : 'dashboard-button-primary'}`}
      >
        {!deleteAction && (
          <span aria-hidden="true" className="text-xl leading-none">
            +
          </span>
        )}
        {label}
      </button>
      {deleteAction && (
        <button
          type="button"
          className="dashboard-text-button dashboard-delete"
          disabled={view !== null}
          aria-haspopup="dialog"
          onClick={(event) => {
            returnFocus.current = event.currentTarget;
            report('');
            setView('delete');
          }}
        >
          Delete
        </button>
      )}
      {view === 'edit' && (
        <ActionForm
          action={action}
          label={label}
          cancel={close}
          returnFocus={returnFocus}
          onSuccess={() => {
            report(`${itemName} saved successfully.`);
            close();
          }}
        >
          {children}
        </ActionForm>
      )}
      {view === 'delete' && deleteAction && (
        <ActionForm
          action={deleteAction}
          label={`Delete ${itemName.toLowerCase()}?`}
          cancel={close}
          returnFocus={returnFocus}
          deleting
          onSuccess={() => {
            returnFocus.current = document.querySelector<HTMLElement>('[data-dashboard-create]');
            report(`${itemName} deleted successfully.`);
            close();
          }}
        >
          {() => (
            <p className="dashboard-delete-copy">
              Delete <strong>{itemTitle}</strong>? This also deletes its related placements
              {itemName === 'Campaign' ? ' and creatives' : ''}. This cannot be undone.
            </p>
          )}
        </ActionForm>
      )}
    </div>
  );
}

export function FormField({
  label,
  name,
  error,
  defaultValue = '',
  options,
  optionLabels,
  multiline,
  type = 'text',
  ...inputProps
}: {
  label: string;
  name: string;
  error?: string;
  defaultValue?: string;
  options?: readonly string[];
  optionLabels?: Record<string, string>;
  multiline?: boolean;
  type?: string;
  min?: string;
  max?: string;
  step?: string;
  required?: boolean;
}) {
  const id = useId();
  // Controlled values survive React's automatic form reset after validation failures.
  const [value, setValue] = useState(defaultValue);
  const props = {
    id,
    name,
    value,
    'aria-invalid': !!error,
    'aria-describedby': error ? `${id}-error` : undefined,
    className: 'dashboard-input',
  };
  return (
    <div className="dashboard-field">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {options ? (
        <select {...props} onChange={(event) => setValue(event.target.value)}>
          {options.map((option) => (
            <option key={option} value={option}>
              {optionLabels?.[option] ?? option}
            </option>
          ))}
        </select>
      ) : multiline ? (
        <textarea {...props} onChange={(event) => setValue(event.target.value)} />
      ) : (
        <input
          {...props}
          {...inputProps}
          type={type}
          onChange={(event) => setValue(event.target.value)}
        />
      )}
      {error && (
        <p id={`${id}-error`} className="dashboard-field-error">
          {error}
        </p>
      )}
    </div>
  );
}
