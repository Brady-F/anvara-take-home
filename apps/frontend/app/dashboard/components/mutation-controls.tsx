'use client';

import {
  createContext,
  useActionState,
  useContext,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useFormStatus } from 'react-dom';
import type { FormAction, FormState } from '../form-state';

const FeedbackContext = createContext<(message: string) => void>(() => {});

export function DashboardFeedback({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('');
  return (
    <FeedbackContext value={setMessage}>
      <p role="status" className="text-green-700 dark:text-green-400">
        {message}
      </p>
      {children}
    </FeedbackContext>
  );
}

function FormContents({
  children,
  deleting = false,
  cancel,
  editButton,
  hideSubmit = false,
}: {
  children?: ReactNode;
  deleting?: boolean;
  cancel?: () => void;
  editButton?: ReactNode;
  hideSubmit?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <fieldset disabled={pending} className="min-w-0 space-y-3">
      {children}
      <div className="flex gap-3">
        {editButton}
        {!hideSubmit && (
          <button
            type="submit"
            disabled={pending}
            className={`rounded border px-3 py-2 disabled:opacity-50 ${deleting ? 'text-red-700 dark:text-red-400' : ''}`}
          >
            {pending ? (deleting ? 'Deleting...' : 'Saving...') : deleting ? 'Delete' : 'Save'}
          </button>
        )}
        {cancel && (
          <button type="button" disabled={pending} onClick={cancel} className="underline">
            Cancel
          </button>
        )}
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
}: {
  action: FormAction;
  children: (state: FormState) => ReactNode;
  onSuccess: () => void;
  cancel: () => void;
  label: string;
}) {
  const [state, formAction] = useActionState(async (previous: FormState, data: FormData) => {
    try {
      const result = await action(previous, data);
      if (result.success) onSuccess();
      return result;
    } catch {
      return { error: 'Unable to save your changes. Please try again.' };
    }
  }, {});
  return (
    <form
      action={formAction}
      aria-label={label}
      noValidate
      className="mt-3 space-y-3 rounded border p-4"
    >
      <FormContents cancel={cancel}>
        {children(state)}
        {state.fieldErrors && (
          <p role="alert" className="text-red-700 dark:text-red-400">
            Please correct the highlighted fields.
          </p>
        )}
        {state.error && (
          <p role="alert" className="text-red-700 dark:text-red-400">
            {state.error}
          </p>
        )}
      </FormContents>
    </form>
  );
}

export function MutationControls({
  action,
  deleteAction,
  label,
  itemName,
  children,
}: {
  action: FormAction;
  deleteAction?: FormAction;
  label: string;
  itemName: string;
  children: (state: FormState) => ReactNode;
}) {
  // shortcut: forms need JavaScript; use native disclosures and direct actions if no-script access is required.
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const report = useContext(FeedbackContext);
  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };
  const triggerButton = (
    <button
      ref={trigger}
      type="button"
      onClick={() => {
        report('');
        setOpen(true);
      }}
      aria-expanded={open}
      className="rounded border px-3 py-2"
    >
      {label}
    </button>
  );
  return (
    <div className="mt-3">
      {deleteAction ? (
        <DeleteForm
          action={deleteAction}
          itemName={itemName}
          editButton={triggerButton}
          editing={open}
        />
      ) : (
        triggerButton
      )}
      {open && (
        <ActionForm
          action={action}
          label={label}
          cancel={close}
          onSuccess={() => {
            report(`${itemName} saved successfully.`);
            close();
          }}
        >
          {children}
        </ActionForm>
      )}
    </div>
  );
}

function DeleteForm({
  action,
  itemName,
  editButton,
  editing,
}: {
  action: FormAction;
  itemName: string;
  editButton: ReactNode;
  editing: boolean;
}) {
  const report = useContext(FeedbackContext);
  const [state, formAction] = useActionState(async (previous: FormState, data: FormData) => {
    try {
      const result = await action(previous, data);
      if (result.success) report(`${itemName} deleted successfully.`);
      return result;
    } catch {
      return { error: 'Unable to delete this item. Please try again.' };
    }
  }, {});
  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        report('');
        if (
          !window.confirm(
            `Delete ${itemName}? This also deletes its related placements${itemName === 'Campaign' ? ' and creatives' : ''}. This cannot be undone.`
          )
        )
          event.preventDefault();
      }}
    >
      <FormContents deleting editButton={editButton} hideSubmit={editing} />
      {!editing && state.error && (
        <p role="alert" className="mt-2 text-red-700 dark:text-red-400">
          {state.error}
        </p>
      )}
    </form>
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
    className: 'mt-1 w-full rounded border bg-transparent px-3 py-2',
  };
  return (
    <div>
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
        <p id={`${id}-error`} className="mt-1 text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
