import { z } from 'zod';

export const academicEntityStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);

export type AcademicEntityStatusInput = z.infer<
  typeof academicEntityStatusSchema
>;

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày phải có định dạng YYYY-MM-DD');

export function parseIsoDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function toIsoDateString(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function assertValidDateRange(startDate: string, endDate: string): void {
  if (endDate <= startDate) {
    throw new Error('INVALID_DATE_RANGE');
  }
}
