import { describe, expect, it } from 'vitest';
import {
  buildFilters,
  calculatePercentChange,
  formatCurrency,
  getParam,
  parsePagination,
} from './helpers.js';

describe('typed API helpers', () => {
  it('extracts string parameters without treating nested query objects as strings', () => {
    expect(getParam('slot-1')).toBe('slot-1');
    expect(getParam(['slot-1', 'slot-2'])).toBe('slot-1');
    expect(getParam([])).toBe('');
    expect(getParam({ id: 'slot-1' })).toBe('');
    expect(getParam(undefined)).toBe('');
  });

  it('parses pagination and defaults missing or nested query values', () => {
    expect(parsePagination({})).toEqual({ page: 1, limit: 10, skip: 0 });
    expect(parsePagination({ page: '3', limit: '5' })).toEqual({ page: 3, limit: 5, skip: 10 });
    expect(parsePagination({ page: ['2', '3'], limit: '5' })).toEqual({
      page: 2,
      limit: 5,
      skip: 5,
    });
    expect(parsePagination({ page: { nested: '3' }, limit: 'invalid' })).toEqual({
      page: 1,
      limit: 10,
      skip: 0,
    });
  });

  it('copies only allowed, defined query filters', () => {
    expect(
      buildFilters({ status: 'ACTIVE', publisherId: 'publisher-1' }, ['status', 'type'])
    ).toEqual({ status: 'ACTIVE' });
  });

  it('formats numeric amounts as USD currency', () => {
    expect(formatCurrency(1234.5)).toBe('$1,234.50');
  });

  it('calculates increases and decreases without dividing by zero', () => {
    expect(calculatePercentChange(100, 125)).toBe(25);
    expect(calculatePercentChange(100, 75)).toBe(-25);
    expect(calculatePercentChange(0, 10)).toBe(100);
    expect(calculatePercentChange(0, 0)).toBe(0);
  });
});
