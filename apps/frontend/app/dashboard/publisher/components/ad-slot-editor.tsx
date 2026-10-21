'use client';

import type { AdSlot } from '@/lib/types';
import { createAdSlot, updateAdSlot, deleteAdSlot } from '../actions';
import { FormField, MutationControls } from '../../components/mutation-controls';

export function AdSlotEditor({ adSlot }: { adSlot?: AdSlot }) {
  return (
    <MutationControls
      action={adSlot ? updateAdSlot.bind(null, adSlot.id) : createAdSlot}
      deleteAction={adSlot ? deleteAdSlot.bind(null, adSlot.id) : undefined}
      label={adSlot ? 'Edit Ad Slot' : 'Create Ad Slot'}
      itemName="Ad slot"
    >
      {(state) => (
        <>
          <FormField
            label="Name"
            name="name"
            defaultValue={adSlot?.name}
            error={state.fieldErrors?.name}
            required
          />
          <FormField
            label="Description"
            name="description"
            defaultValue={adSlot?.description ?? ''}
            error={state.fieldErrors?.description}
            multiline
          />
          <FormField
            label="Type"
            name="type"
            defaultValue={adSlot?.type ?? 'DISPLAY'}
            options={['DISPLAY', 'VIDEO', 'NATIVE', 'NEWSLETTER', 'PODCAST']}
            error={state.fieldErrors?.type}
          />
          <FormField
            label="Base price ($/mo)"
            name="basePrice"
            type="number"
            min="0.01"
            max="99999999.99"
            step="0.01"
            defaultValue={adSlot?.basePrice}
            error={state.fieldErrors?.basePrice}
            required
          />
          <FormField
            label="Availability"
            name="isAvailable"
            defaultValue={String(adSlot?.isAvailable ?? true)}
            options={['true', 'false']}
            optionLabels={{ true: 'Available', false: 'Unavailable' }}
            error={state.fieldErrors?.isAvailable}
          />
        </>
      )}
    </MutationControls>
  );
}
