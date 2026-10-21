// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Campaign } from '@/lib/types';
import { CampaignEditor } from '../sponsor/components/campaign-editor';
import { AdSlotEditor } from '../publisher/components/ad-slot-editor';
import { createCampaign, updateCampaign, deleteCampaign } from '../sponsor/actions';
import { createAdSlot } from '../publisher/actions';
import { DashboardFeedback } from './mutation-controls';
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
  fireEvent.change(screen.getByLabelText('Budget ($)'), { target: { value: '100' } });
  fireEvent.submit(screen.getByRole('form', { name: 'Create Campaign' }));
  await screen.findByText('Campaign saved successfully.');
  expect(screen.queryByRole('form')).toBeNull();
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Create Campaign' }));
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
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Edit Campaign' }));
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
  fireEvent.submit(screen.getByRole('form'));
  await screen.findByRole('button', { name: 'Saving...' });
  try {
    expect((screen.getByRole('button', { name: 'Saving...' }) as HTMLButtonElement).disabled).toBe(
      true
    );
    expect((screen.getByRole('button', { name: 'Cancel' }) as HTMLButtonElement).disabled).toBe(
      true
    );
    for (const label of ['Name', 'Description', 'Type', 'Base price ($/mo)', 'Availability']) {
      expect(screen.getByLabelText(label).matches(':disabled')).toBe(true);
    }
  } finally {
    finish({ success: true });
    await screen.findByText('Ad slot saved successfully.');
  }
  expect(screen.queryByRole('form')).toBeNull();
});
it('requires delete confirmation and shows pending and success feedback', async () => {
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  let finish!: (value: FormState) => void;
  vi.mocked(deleteCampaign).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    })
  );
  render(
    <DashboardFeedback>
      <CampaignEditor campaign={campaign} />
    </DashboardFeedback>
  );
  fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
  expect(deleteCampaign).not.toHaveBeenCalled();
  expect(confirm).toHaveBeenCalledWith(expect.stringContaining('placements and creatives'));
  confirm.mockReturnValue(true);
  fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
  await screen.findByRole('button', { name: 'Deleting...' });
  expect((screen.getByRole('button', { name: 'Deleting...' }) as HTMLButtonElement).disabled).toBe(
    true
  );
  try {
    expect(screen.getByRole('button', { name: 'Edit Campaign' }).matches(':disabled')).toBe(true);
  } finally {
    finish({ success: true });
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toBe('Campaign deleted successfully.')
    );
  }
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
