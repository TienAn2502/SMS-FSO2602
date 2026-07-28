import { format, isValid, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DATE_PATTERN = 'dd/MM/yyyy';
const DATETIME_PATTERN = 'dd/MM/yyyy HH:mm';

function toDate(value: string | Date): Date {
  if (value instanceof Date) {
    return value;
  }

  if (DATE_ONLY_PATTERN.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  return parseISO(value);
}

export function formatDateVi(
  value: string | Date | null | undefined,
  pattern = DATE_PATTERN,
): string {
  if (!value) {
    return '—';
  }

  const date = toDate(value);

  if (!isValid(date)) {
    return '—';
  }

  return format(date, pattern, { locale: vi });
}

export function formatDateTimeVi(
  value: string | Date | null | undefined,
): string {
  return formatDateVi(value, DATETIME_PATTERN);
}

export function formatDateRangeVi(
  start: string,
  end: string,
  separator = ' → ',
): string {
  return `${formatDateVi(start)}${separator}${formatDateVi(end)}`;
}
