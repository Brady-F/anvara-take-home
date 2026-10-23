// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, act } from '@testing-library/react';
import { AnimatedGrid } from './animated-grid';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const empty = <p>No items</p>;
const items = (ids: string[]) => ids.map((id) => ({ id, content: <button>{id}</button> }));

it('preserves existing nodes on insertion and reorder, and retains only inert exits', async () => {
  const view = render(<AnimatedGrid items={items(['A', 'B'])} empty={empty} />);
  const a = screen.getByRole('button', { name: 'A' });
  view.rerender(<AnimatedGrid items={items(['C', 'B', 'A'])} empty={empty} />);
  expect(screen.getByRole('button', { name: 'A' })).toBe(a);
  expect(screen.getAllByRole('button').map((node) => node.textContent)).toEqual(['C', 'B', 'A']);
  view.rerender(<AnimatedGrid items={items(['C', 'B'])} empty={empty} />);
  expect(a.closest('[inert]')).not.toBeNull();
  await waitFor(() => expect(a.isConnected).toBe(false));
  expect(screen.getAllByRole('button').map((node) => node.textContent)).toEqual(['C', 'B']);
});

it('cancels removal when an item returns before its exit finishes', async () => {
  const view = render(<AnimatedGrid items={items(['A'])} empty={empty} />);
  const a = screen.getByRole('button', { name: 'A' });
  view.rerender(<AnimatedGrid items={[]} empty={empty} />);
  expect(a.closest('[inert]')).not.toBeNull();
  view.rerender(<AnimatedGrid items={items(['A'])} empty={empty} />);
  expect(screen.getByRole('button', { name: 'A' })).toBe(a);
  expect(a.closest('[inert]')).toBeNull();
  await waitFor(() => expect(screen.queryByText('No items')).toBeNull());
  expect(a.isConnected).toBe(true);
});

it('keeps the grid mounted across empty and populated results', async () => {
  const view = render(<AnimatedGrid items={[]} empty={empty} />);
  const grid = view.container.firstElementChild;
  view.rerender(<AnimatedGrid items={items(['A'])} empty={empty} />);
  await waitFor(() => expect(screen.queryByText('No items')).toBeNull());
  view.rerender(<AnimatedGrid items={[]} empty={empty} />);
  await waitFor(() => expect(screen.queryByRole('button')).toBeNull());
  expect(view.container.firstElementChild).toBe(grid);
  expect(screen.getByText('No items')).toBeTruthy();
});

it('recovers focus after removing a trigger whose dialog has already closed', async () => {
  const dashboard = (visible: boolean) => (
    <>
      <button data-dashboard-create>Create</button>
      <AnimatedGrid items={items(visible ? ['Edit'] : [])} empty={empty} />
    </>
  );
  const view = render(dashboard(true));
  screen.getByRole('button', { name: 'Edit' }).focus();
  view.rerender(dashboard(false));
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull());
  await waitFor(() =>
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Create' }))
  );
});

it('responds to reduced-motion changes and removes exits without a timed animation', async () => {
  const media = new EventTarget();
  const preference = Object.assign(media, { matches: false });
  vi.stubGlobal('matchMedia', () => preference);
  const view = render(<AnimatedGrid items={items(['A'])} empty={empty} />);
  act(() => {
    preference.matches = true;
    media.dispatchEvent(new Event('change'));
  });
  view.rerender(<AnimatedGrid items={items(['B'])} empty={empty} />);
  const b = screen.getByRole('button', { name: 'B' }).parentElement!;
  expect(b.style.opacity).toBe('1');
  expect(b.style.transform).toBe('none');
  await waitFor(() => expect(screen.queryByRole('button', { name: 'A' })).toBeNull());
});
