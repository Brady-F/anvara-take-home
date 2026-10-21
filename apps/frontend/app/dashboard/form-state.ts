export interface FormState {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export type FormAction = (previous: FormState, formData: FormData) => Promise<FormState>;

export function textField(form: FormData, field: string): string {
  const value = form.get(field);
  return typeof value === 'string' ? value.trim() : '';
}

export function validMoney(value: string): boolean {
  return /^\d+(\.\d{1,2})?$/.test(value) && Number(value) > 0 && Number(value) <= 99_999_999.99;
}

export function validDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00Z`);
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    value >= '0001-01-01' &&
    Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}
