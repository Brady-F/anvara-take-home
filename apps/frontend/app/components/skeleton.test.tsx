// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { PendingLabel } from './skeleton';
import { DashboardLoading } from '../dashboard/components/dashboard-ui';

afterEach(cleanup);

it('keeps the original button footprint and an accessible pending name, then restores its label', () => {
  const { rerender } = render(
    <button disabled aria-busy="true">
      <PendingLabel pending label="Saving...">
        Save
      </PendingLabel>
    </button>
  );
  const button = screen.getByRole('button', { name: 'Saving...' });
  expect(button.querySelector('.dashboard-skeleton')?.getAttribute('aria-hidden')).toBe('true');
  expect(screen.getByText('Save').className).toBe('invisible');
  expect(screen.getByText('Saving...').className).toBe('sr-only');
  rerender(
    <button>
      <PendingLabel pending={false} label="Saving...">
        Save
      </PendingLabel>
    </button>
  );
  expect(
    screen.getByRole('button', { name: 'Save' }).querySelector('.dashboard-skeleton')
  ).toBeNull();
});

it.each(['campaigns', 'ad slots'] as const)(
  'matches the %s dashboard sections without interactive placeholders',
  (noun) => {
    render(<DashboardLoading noun={noun} />);
    const status = screen.getByRole('status');
    expect(status.querySelectorAll('.dashboard-summary > div')).toHaveLength(3);
    expect(status.querySelectorAll('.dashboard-filter-field')).toHaveLength(
      noun === 'campaigns' ? 3 : 4
    );
    expect(status.querySelectorAll('.dashboard-card')).toHaveLength(3);
    expect(status.querySelectorAll('.dashboard-spending')).toHaveLength(
      noun === 'campaigns' ? 3 : 0
    );
    expect(status.querySelector('.dashboard-results-heading .dashboard-skeleton')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('heading')).toBeNull();
  }
);
