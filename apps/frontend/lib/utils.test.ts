import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { cn, debounce, formatPrice, parseQueryString, sleep } from './utils';

afterEach(() => {
  vi.useRealTimers();
});

describe('typed frontend utilities', () => {
  it('debounces calls while preserving the callback argument types', () => {
    vi.useFakeTimers();
    const callback = vi.fn<(value: number, label: string) => void>();
    const debounced = debounce(callback, 100);
    expectTypeOf(debounced).parameters.toEqualTypeOf<[number, string]>();

    debounced(1, 'first');
    vi.advanceTimersByTime(50);
    debounced(2, 'last');
    vi.advanceTimersByTime(99);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledExactlyOnceWith(2, 'last');
  });

  it('parses decoded string values and keeps the last duplicate', () => {
    expect(parseQueryString('?name=Ad+Slot&status=DRAFT&status=ACTIVE&empty=')).toEqual({
      name: 'Ad Slot',
      status: 'ACTIVE',
      empty: '',
    });
    expect(parseQueryString('')).toEqual({});
  });

  it('formats numeric prices as USD currency', () => {
    expect(formatPrice(1234.5)).toBe('$1,234.50');
  });

  it('joins class names while omitting false, missing, and empty values', () => {
    expect(cn('card', false, null, undefined, '', 'active')).toBe('card active');
  });

  it('waits for the requested delay and resolves without a value', async () => {
    vi.useFakeTimers();
    let resolved = false;
    const result = sleep(100);
    expectTypeOf(result).toEqualTypeOf<Promise<void>>();
    void result.then(() => {
      resolved = true;
    });

    await vi.advanceTimersByTimeAsync(99);
    expect(resolved).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await expect(result).resolves.toBeUndefined();
  });
});
