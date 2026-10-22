// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { Campaign } from '@/lib/types';
import { CampaignEditor } from '../sponsor/components/campaign-editor';
import { AdSlotEditor } from '../publisher/components/ad-slot-editor';
import { createCampaign, updateCampaign, deleteCampaign } from '../sponsor/actions';
import { createAdSlot } from '../publisher/actions';
import { ApplyFilters, DashboardFeedback } from './mutation-controls';
import type { FormState } from '../form-state';

vi.mock('../sponsor/actions', () => ({
  createCampaign: vi.fn(),
  updateCampaign: vi.fn(),
  deleteCampaign: vi.fn(),
}));
vi.mock('../publisher/actions', () => ({
  createAdSlot: vi.fn(),
  updateAdSlot: vi.fn(),
  deleteAdSlot: vi.fn(),
}));
// jsdom does not implement the native dialog lifecycle; browser checks cover focus containment.
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  vi.restoreAllMocks();
});
const campaign: Campaign = {
  id: 'campaign-1',
  sponsorId: 'sponsor-1',
  name: 'Launch',
  description: 'Readers',
  budget: '100.50',
  spent: '0',
  status: 'ACTIVE',
  startDate: '2026-10-21T00:00:00.000Z',
  endDate: '2026-10-22T00:00:00.000Z',
};

it('keeps input and field errors after failure, then shows success and closes the form', async () => {
  vi.mocked(createCampaign)
    .mockResolvedValueOnce({ fieldErrors: { budget: 'Enter a positive budget.' } })
    .mockResolvedValueOnce({ success: true });
  render(
    <DashboardFeedback>
      <CampaignEditor />
    </DashboardFeedback>
  );
  fireEvent.click(screen.getByRole('button', { name: 'Create Campaign' }));
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'My launch' } });
  fireEvent.submit(screen.getByRole('form', { name: 'Create Campaign' }));
  await screen.findByText('Enter a positive budget.');
  expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('My launch');
  expect(screen.getByLabelText('Budget ($)').getAttribute('aria-invalid')).toBe('true');
  expect(document.activeElement).toBe(screen.getByLabelText('Budget ($)'));
  fireEvent.change(screen.getByLabelText('Budget ($)'), { target: { value: '100' } });
  fireEvent.submit(screen.getByRole('form', { name: 'Create Campaign' }));
  await screen.findByText('Campaign saved successfully.');
  expect(screen.queryByRole('form')).toBeNull();
  await waitFor(() =>
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Create Campaign' }))
  );
  fireEvent.click(screen.getByRole('button', { name: 'Create Campaign' }));
  expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('');
});
it('prefills campaign edits and binds the item ID to the action', async () => {
  vi.mocked(updateCampaign).mockResolvedValue({ error: 'Try again.' });
  render(<CampaignEditor campaign={campaign} />);
  fireEvent.click(screen.getByRole('button', { name: 'Edit Campaign' }));
  expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Launch');
  expect((screen.getByLabelText('Budget ($)') as HTMLInputElement).value).toBe('100.50');
  expect((screen.getByLabelText('Start date') as HTMLInputElement).value).toBe('2026-10-21');
  expect((screen.getByLabelText('End date') as HTMLInputElement).value).toBe('2026-10-22');
  fireEvent.submit(screen.getByRole('form'));
  expect((await screen.findByRole('alert')).textContent).toBe('Try again.');
  expect(updateCampaign).toHaveBeenCalledWith('campaign-1', {}, expect.any(FormData));
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByRole('form')).toBeNull();
  await waitFor(() =>
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Edit Campaign' }))
  );
});
it('disables form fields, saving, and cancel while the server action is pending', async () => {
  let finish!: (value: FormState) => void;
  vi.mocked(createAdSlot).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    })
  );
  render(
    <DashboardFeedback>
      <AdSlotEditor />
    </DashboardFeedback>
  );
  fireEvent.click(screen.getByRole('button', { name: 'Create Ad Slot' }));
  expect(document.activeElement).toBe(screen.getByLabelText('Name'));
  fireEvent.submit(screen.getByRole('form'));
  await screen.findByRole('button', { name: 'Saving...' });
  try {
    expect((screen.getByRole('button', { name: 'Saving...' }) as HTMLButtonElement).disabled).toBe(
      true
    );
    expect((screen.getByRole('button', { name: 'Cancel' }) as HTMLButtonElement).disabled).toBe(
      true
    );
    expect(screen.getByRole('button', { name: 'Close dialog' }).matches(':disabled')).toBe(true);
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
    expect(screen.queryByRole('dialog')).not.toBeNull();
    for (const label of ['Name', 'Description', 'Type', 'Base price ($/mo)', 'Availability']) {
      expect(screen.getByLabelText(label).matches(':disabled')).toBe(true);
    }
  } finally {
    finish({ success: true });
    await screen.findByText('Ad slot saved successfully.');
  }
  expect(screen.queryByRole('form')).toBeNull();
});
it('requires a named delete confirmation, supports cancellation, and focuses Create after success', async () => {
  let finish!: (value: FormState) => void;
  vi.mocked(deleteCampaign).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    })
  );
  render(
    <DashboardFeedback>
      <CampaignEditor />
      <CampaignEditor campaign={campaign} />
    </DashboardFeedback>
  );
  fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
  const dialog = screen.getByRole('dialog');
  expect(dialog.textContent).toContain('Launch');
  expect(dialog.textContent).toContain('placements and creatives');
  expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: 'Cancel' }));
  expect(deleteCampaign).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByRole('dialog')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
  fireEvent.submit(screen.getByRole('form'));
  await screen.findByRole('button', { name: 'Deleting...' });
  try {
    expect(screen.getByRole('button', { name: 'Deleting...' }).matches(':disabled')).toBe(true);
    expect(screen.getByRole('button', { name: 'Edit Campaign' }).matches(':disabled')).toBe(true);
    expect(screen.getByRole('button', { name: 'Cancel' }).matches(':disabled')).toBe(true);
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
    expect(screen.queryByRole('dialog')).not.toBeNull();
  } finally {
    finish({ success: true });
    await screen.findByText('Campaign deleted successfully.');
  }
  await waitFor(() =>
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Create Campaign' }))
  );
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
  expect(screen.getByRole('status').textContent).toBe('');
});

it('keeps the form open with a safe message when the Server Action request rejects', async () => {
  vi.mocked(createAdSlot).mockRejectedValue(new Error('private transport error'));
  render(<AdSlotEditor />);
  fireEvent.click(screen.getByRole('button', { name: 'Create Ad Slot' }));
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Banner' } });
  fireEvent.submit(screen.getByRole('form'));
  expect((await screen.findByRole('alert')).textContent).toBe(
    'Unable to save your changes. Please try again.'
  );
  expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Banner');
});

it('omits unchanged campaign dates so editing a name preserves stored times', async () => {
  vi.mocked(updateCampaign).mockResolvedValue({ error: 'Try again.' });
  render(
    <CampaignEditor
      campaign={{
        ...campaign,
        startDate: '2026-10-21T10:30:00.123Z',
        endDate: '2026-10-21T16:45:00.456Z',
      }}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'Edit Campaign' }));
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Renamed' } });
  fireEvent.submit(screen.getByRole('form'));
  await screen.findByRole('alert');
  const first = vi.mocked(updateCampaign).mock.calls[0][2];
  expect(first.get('name')).toBe('Renamed');
  expect(first.has('startDate')).toBe(false);
  expect(first.has('endDate')).toBe(false);
  fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2026-10-22' } });
  fireEvent.submit(screen.getByRole('form'));
  await waitFor(() => expect(updateCampaign).toHaveBeenCalledTimes(2));
  const second = vi.mocked(updateCampaign).mock.calls[1][2];
  expect(second.has('startDate')).toBe(false);
  expect(second.get('endDate')).toBe('2026-10-22');
});

it('returns focus to Create when revalidation removes the open card', () => {
  const view = render(
    <DashboardFeedback>
      <CampaignEditor />
      <CampaignEditor campaign={campaign} />
    </DashboardFeedback>
  );
  fireEvent.click(screen.getByRole('button', { name: 'Edit Campaign' }));
  view.rerender(
    <DashboardFeedback>
      <CampaignEditor />
    </DashboardFeedback>
  );
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Create Campaign' }));
});

it('recovers focus when the filtered card disappears after a successful save', async () => {
  vi.mocked(updateCampaign).mockResolvedValue({ success: true });
  const view = render(
    <DashboardFeedback>
      <CampaignEditor />
      <CampaignEditor campaign={campaign} />
    </DashboardFeedback>
  );
  fireEvent.click(screen.getByRole('button', { name: 'Edit Campaign' }));
  fireEvent.submit(screen.getByRole('form'));
  await screen.findByText('Campaign saved successfully.');
  view.rerender(
    <DashboardFeedback>
      <CampaignEditor />
    </DashboardFeedback>
  );
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Create Campaign' }));
});

it('shows pending feedback while filters are being applied', async () => {
  let finish!: () => void;
  render(
    <form
      aria-label="Filters"
      action={() =>
        new Promise<void>((resolve) => {
          finish = resolve;
        })
      }
    >
      <ApplyFilters />
    </form>
  );
  fireEvent.submit(screen.getByRole('form'));
  try {
    expect((await screen.findByRole('button', { name: 'Applying...' })).matches(':disabled')).toBe(
      true
    );
  } finally {
    finish();
  }
  expect((await screen.findByRole('button', { name: 'Apply' })).matches(':disabled')).toBe(false);
});
