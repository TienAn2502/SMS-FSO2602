import { z } from 'zod';

import { isoDateSchema } from '@/common/schemas/academic.schema';
import { paginationSchema } from '@/common/schemas/shared.schema';

export const attendanceSessionStatusSchema = z.enum(['OPEN', 'CLOSED']);

export const periodNumberSchema = z.coerce
  .number()
  .int('Tiết phải là số nguyên')
  .min(1, 'Tiết phải >= 1')
  .max(12, 'Tiết phải <= 12');

export const listAttendanceSessionsQuerySchema = paginationSchema.extend({
  courseSectionId: z.uuid().optional(),
  teacherId: z.uuid().optional(),
  semesterId: z.uuid().optional(),
  academicYearId: z.uuid().optional(),
  homeroomClassId: z.uuid().optional(),
  sessionDate: isoDateSchema.optional(),
  status: attendanceSessionStatusSchema.optional(),
  includeAllSemesters: z.coerce.boolean().optional().default(false),
  sortBy: z.enum(['sessionDate', 'periodNumber', 'status']).default('sessionDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type ListAttendanceSessionsQuery = z.infer<
  typeof listAttendanceSessionsQuerySchema
>;

export const createAttendanceSessionSchema = z.object({
  courseSectionId: z.uuid('Lớp môn không hợp lệ'),
  teacherId: z.uuid('Giáo viên không hợp lệ'),
  sessionDate: isoDateSchema,
  periodNumber: periodNumberSchema,
  timetableEntryId: z.uuid('Tiết TKB không hợp lệ').optional(),
  note: z.string().trim().max(2000).optional(),
});

export type CreateAttendanceSessionInput = z.infer<
  typeof createAttendanceSessionSchema
>;

export const updateAttendanceSessionSchema = z
  .object({
    status: attendanceSessionStatusSchema.optional(),
    note: z.string().trim().max(2000).nullable().optional(),
  })
  .refine(
    (value) => value.status !== undefined || value.note !== undefined,
    { message: 'Cần ít nhất một trường để cập nhật' },
  );

export type UpdateAttendanceSessionInput = z.infer<
  typeof updateAttendanceSessionSchema
>;
