// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import LoginPage from './page';

const signIn = vi.hoisted(() => vi.fn());
vi.mock('@/auth-client', () => ({ authClient: { signIn: { email: signIn } } }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

it('preserves the selected account and re-enables login after a rejected sign-in', async () => {
  let finish!: (value: { error: { message: string } }) => void;
  signIn.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    })
  );
  render(<LoginPage />);
  const role = screen.getByRole('combobox', { name: 'Account type' });
  fireEvent.change(role, { target: { value: 'publisher' } });
  fireEvent.click(screen.getByRole('button', { name: 'Login as Publisher' }));
  expect(role.matches(':disabled')).toBe(true);
  expect(screen.getByRole('button', { name: 'Logging in...' }).matches(':disabled')).toBe(true);
  expect(signIn.mock.calls[0][0].email).toBe('publisher@example.com');
  await act(async () => finish({ error: { message: 'Login failed' } }));
  expect(screen.getByRole('alert').textContent).toBe('Login failed');
  expect(role.matches(':disabled')).toBe(false);
  expect(screen.getByRole('button', { name: 'Login as Publisher' }).matches(':disabled')).toBe(
    false
  );
});
