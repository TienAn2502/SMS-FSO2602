import type { ColumnFiltersState } from '@tanstack/react-table';

export function getColumnFilterValue<T>(
  filters: ColumnFiltersState,
  id: string,
): T | undefined {
  const value = filters.find((filter) => filter.id === id)?.value;
  if (value === undefined || value === '') {
    return undefined;
  }
  return value as T;
}

export function setColumnFilterValue(
  filters: ColumnFiltersState,
  id: string,
  value: string | undefined,
): ColumnFiltersState {
  const next = filters.filter((filter) => filter.id !== id);
  if (value) {
    next.push({ id, value });
  }
  return next;
}

export function hasColumnFilters(
  filters: ColumnFiltersState,
  globalFilter: string,
): boolean {
  return Boolean(globalFilter.trim()) || filters.length > 0;
}
