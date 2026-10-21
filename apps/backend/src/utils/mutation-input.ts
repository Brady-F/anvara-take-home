import { AdSlotType, CampaignStatus } from '../db.js';

export class InvalidInput extends Error {}

export function objectInput(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new InvalidInput('Request body must be an object');
  }
  return value as Record<string, unknown>;
}

function checkFields(body: Record<string, unknown>, allowed: string[], required: string[]) {
  if (Object.keys(body).some((key) => !allowed.includes(key))) {
    throw new InvalidInput('Request contains unsupported fields');
  }
  if (required.some((key) => body[key] === undefined)) {
    throw new InvalidInput(`Required fields: ${required.join(', ')}`);
  }
}

function textInput(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim() || value.includes('\u0000')) {
    throw new InvalidInput(`${field} must be a non-empty string`);
  }
  return value.trim();
}

function nullableText(value: unknown, field: string): string | null {
  if (value === null) return null;
  if (typeof value !== 'string' || value.includes('\u0000')) {
    throw new InvalidInput(`${field} must be a string without null bytes, or null`);
  }
  return value;
}

function moneyInput(value: unknown, field: string, positive = false): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    (positive ? value <= 0 : value < 0) ||
    value > 99_999_999.99 ||
    !/^\d+(\.\d{1,2})?$/.test(String(value))
  ) {
    throw new InvalidInput(
      `${field} must be ${positive ? 'positive' : 'non-negative'}, with at most 8 integer and 2 decimal digits`
    );
  }
  return value;
}

function dateInput(value: unknown, field: string): Date {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2}))?$/.test(value)
  ) {
    throw new InvalidInput(`${field} must be an ISO date or timestamp with a timezone`);
  }
  const date = new Date(value);
  const day = value.slice(0, 10);
  const calendarDate = new Date(`${day}T00:00:00Z`);
  if (
    !Number.isFinite(date.getTime()) ||
    !Number.isFinite(calendarDate.getTime()) ||
    date.getUTCFullYear() < 1 ||
    calendarDate.getUTCFullYear() < 1 ||
    calendarDate.toISOString().slice(0, 10) !== day
  ) {
    throw new InvalidInput(`${field} must be a valid date`);
  }
  return date;
}

export function checkDateRange(start: Date, end: Date) {
  if (end <= start) throw new InvalidInput('endDate must be after startDate');
}

function stringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) throw new InvalidInput(`${field} must be an array of strings`);
  return value.map((item) => textInput(item, field));
}

interface CampaignInput {
  name: string;
  description?: string | null;
  budget: number;
  cpmRate?: number | null;
  cpcRate?: number | null;
  startDate: Date;
  endDate: Date;
  targetCategories?: string[];
  targetRegions?: string[];
  status?: CampaignStatus;
}

export function campaignInput(
  body: Record<string, unknown>,
  partial = false
): Partial<CampaignInput> {
  checkFields(
    body,
    [
      'name',
      'description',
      'budget',
      'cpmRate',
      'cpcRate',
      'startDate',
      'endDate',
      'targetCategories',
      'targetRegions',
      'status',
      'sponsorId',
    ],
    partial ? [] : ['name', 'budget', 'startDate', 'endDate']
  );
  const data: Partial<CampaignInput> = {};
  if ('name' in body) data.name = textInput(body.name, 'name');
  if ('description' in body) data.description = nullableText(body.description, 'description');
  if ('budget' in body) data.budget = moneyInput(body.budget, 'budget', true);
  for (const field of ['cpmRate', 'cpcRate'] as const) {
    if (field in body) data[field] = body[field] === null ? null : moneyInput(body[field], field);
  }
  if ('startDate' in body) data.startDate = dateInput(body.startDate, 'startDate');
  if ('endDate' in body) data.endDate = dateInput(body.endDate, 'endDate');
  for (const field of ['targetCategories', 'targetRegions'] as const) {
    if (field in body) data[field] = stringArray(body[field], field);
  }
  if ('status' in body) {
    if (!Object.values(CampaignStatus).includes(body.status as CampaignStatus)) {
      throw new InvalidInput('Invalid campaign status');
    }
    data.status = body.status as CampaignStatus;
  }
  if (data.startDate && data.endDate) checkDateRange(data.startDate, data.endDate);
  if (!Object.keys(data).length) throw new InvalidInput('At least one writable field is required');
  return data;
}

interface AdSlotInput {
  name: string;
  description?: string | null;
  type: AdSlotType;
  position?: string | null;
  width?: number | null;
  height?: number | null;
  basePrice: number;
  cpmFloor?: number | null;
  isAvailable?: boolean;
}

export function adSlotInput(body: Record<string, unknown>, partial = false): Partial<AdSlotInput> {
  checkFields(
    body,
    [
      'name',
      'description',
      'type',
      'position',
      'width',
      'height',
      'basePrice',
      'cpmFloor',
      'isAvailable',
      'publisherId',
    ],
    partial ? [] : ['name', 'type', 'basePrice']
  );
  const data: Partial<AdSlotInput> = {};
  if ('name' in body) data.name = textInput(body.name, 'name');
  for (const field of ['description', 'position'] as const) {
    if (field in body) data[field] = nullableText(body[field], field);
  }
  if ('type' in body) {
    if (!Object.values(AdSlotType).includes(body.type as AdSlotType)) {
      throw new InvalidInput('Invalid ad slot type');
    }
    data.type = body.type as AdSlotType;
  }
  if ('basePrice' in body) data.basePrice = moneyInput(body.basePrice, 'basePrice', true);
  if ('cpmFloor' in body) {
    data.cpmFloor = body.cpmFloor === null ? null : moneyInput(body.cpmFloor, 'cpmFloor');
  }
  for (const field of ['width', 'height'] as const) {
    const value = body[field];
    if (field in body) {
      if (
        value !== null &&
        (typeof value !== 'number' ||
          !Number.isInteger(value) ||
          value <= 0 ||
          value > 2_147_483_647)
      ) {
        throw new InvalidInput(`${field} must be a positive 32-bit integer or null`);
      }
      data[field] = value as number | null;
    }
  }
  if ('isAvailable' in body) {
    if (typeof body.isAvailable !== 'boolean')
      throw new InvalidInput('isAvailable must be a boolean');
    data.isAvailable = body.isAvailable;
  }
  if (!Object.keys(data).length) throw new InvalidInput('At least one writable field is required');
  return data;
}
