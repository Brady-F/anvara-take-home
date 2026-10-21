'use client';

import type { Campaign } from '@/lib/types';
import { createCampaign, updateCampaign, deleteCampaign } from '../actions';
import { FormField, MutationControls } from '../../components/mutation-controls';
import type { FormState } from '../../form-state';

export function CampaignEditor({ campaign }: { campaign?: Campaign }) {
  async function saveCampaign(previous: FormState, form: FormData) {
    if (!campaign) return createCampaign(previous, form);
    // Leave unchanged timestamps intact; date inputs only represent their UTC calendar day.
    for (const field of ['startDate', 'endDate'] as const) {
      if (form.get(field) === campaign[field].slice(0, 10)) form.delete(field);
    }
    return updateCampaign(campaign.id, previous, form);
  }

  return (
    <MutationControls
      action={saveCampaign}
      deleteAction={campaign ? deleteCampaign.bind(null, campaign.id) : undefined}
      label={campaign ? 'Edit Campaign' : 'Create Campaign'}
      itemName="Campaign"
    >
      {(state) => (
        <>
          <FormField
            label="Name"
            name="name"
            defaultValue={campaign?.name}
            error={state.fieldErrors?.name}
            required
          />
          <FormField
            label="Description"
            name="description"
            defaultValue={campaign?.description ?? ''}
            error={state.fieldErrors?.description}
            multiline
          />
          <FormField
            label="Budget ($)"
            name="budget"
            type="number"
            min="0.01"
            max="99999999.99"
            step="0.01"
            defaultValue={campaign?.budget}
            error={state.fieldErrors?.budget}
            required
          />
          <FormField
            label="Start date"
            name="startDate"
            type="date"
            defaultValue={campaign?.startDate.slice(0, 10)}
            error={state.fieldErrors?.startDate}
            required
          />
          <FormField
            label="End date"
            name="endDate"
            type="date"
            defaultValue={campaign?.endDate.slice(0, 10)}
            error={state.fieldErrors?.endDate}
            required
          />
          <FormField
            label="Status"
            name="status"
            defaultValue={campaign?.status ?? 'DRAFT'}
            options={[
              'DRAFT',
              'PENDING_REVIEW',
              'APPROVED',
              'ACTIVE',
              'PAUSED',
              'COMPLETED',
              'CANCELLED',
            ]}
            error={state.fieldErrors?.status}
          />
        </>
      )}
    </MutationControls>
  );
}
