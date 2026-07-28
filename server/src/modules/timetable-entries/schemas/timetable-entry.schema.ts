import { z } from 'zod';

import { academicEntityStatusSchema } from '../../../common/schemas/academic.schema';
import { paginationSchema } from '../../../common/schemas/shared.schema';

export const dayOfWeekSchema = z.coerce
  .number()
  .int('Thứ phải là số nguyên')
  .min(1, 'Thứ phải từ 1 (Thứ 2) đến 5 (Thứ 6)')
  .max(5, 'Thứ phải từ 1 (Thứ 2) đến 5 (Thứ 6)');

export const periodNumberSchema = z.coerce
  .number()
  .int('Tiết phải là số nguyên')
  .min(1, 'Tiết phải >= 1')
  .max(12, 'Tiết phải <= 12');

export const listTimetableEntriesQuerySchema = paginationSchema.extend({
  semesterId: z.uuid().optional(),
  academicYearId: z.uuid().optional(),
  courseSectionId: z.uuid().optional(),
  teacherId: z.uuid().optional(),
  homeroomClassId: z.uuid().optional(),
  dayOfWeek: dayOfWeekSchema.optional(),
  status: academicEntityStatusSchema.optional(),
  includeAllSemesters: z.coerce.boolean().optional().default(false),
  sortBy: z.enum(['dayOfWeek', 'periodNumber']).default('dayOfWeek'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type ListTimetableEntriesQuery = z.infer<
  typeof listTimetableEntriesQuerySchema
>;

export const createTimetableEntrySchema = z.object({
  courseSectionId: z.uuid('Lớp môn không hợp lệ'),
  teacherId: z.uuid('Giáo viên không hợp lệ'),
  dayOfWeek: dayOfWeekSchema,
  periodNumber: periodNumberSchema,
  room: z.string().trim().max(255).optional(),
});

export type CreateTimetableEntryInput = z.infer<
  typeof createTimetableEntrySchema
>;

export const updateTimetableEntrySchema = z
  .object({
    teacherId: z.uuid('Giáo viên không hợp lệ').optional(),
    dayOfWeek: dayOfWeekSchema.optional(),
    periodNumber: periodNumberSchema.optional(),
    room: z.string().trim().max(255).nullable().optional(),
  })
  .refine(
    (value) =>
      value.teacherId !== undefined ||
      value.dayOfWeek !== undefined ||
      value.periodNumber !== undefined ||
      value.room !== undefined,
    { message: 'Cần ít nhất một trường để cập nhật' },
  );

export type UpdateTimetableEntryInput = z.infer<
  typeof updateTimetableEntrySchema
>;
