import { z } from 'zod';

import { isoDateSchema } from '@/common/schemas/academic.schema';
import { paginationSchema } from '@/common/schemas/shared.schema';
import { bulkUpsertAttendanceRecordsSchema } from '@/modules/attendance-records/schemas/attendance-record.schema';
import { periodNumberSchema } from '@/modules/attendance-sessions/schemas/attendance-session.schema';

export const portalMyAttendanceQuerySchema = paginationSchema.extend({
  semesterId: z.uuid().optional(),
  includeAllSemesters: z.coerce.boolean().optional().default(false),
});

export type PortalMyAttendanceQuery = z.infer<
  typeof portalMyAttendanceQuerySchema
>;

export const portalCreateAttendanceSessionSchema = z.object({
  courseSectionId: z.uuid('Lớp môn không hợp lệ'),
  sessionDate: isoDateSchema,
  periodNumber: periodNumberSchema,
  timetableEntryId: z.uuid('Tiết TKB không hợp lệ').optional(),
  note: z.string().trim().max(2000).optional(),
});

export type PortalCreateAttendanceSessionInput = z.infer<
  typeof portalCreateAttendanceSessionSchema
>;

export const portalBulkUpsertAttendanceRecordsSchema =
  bulkUpsertAttendanceRecordsSchema;

export type PortalBulkUpsertAttendanceRecordsInput = z.infer<
  typeof portalBulkUpsertAttendanceRecordsSchema
>;

export const portalCloseAttendanceSessionSchema = z.object({
  status: z.literal('CLOSED'),
  note: z.string().trim().max(2000).nullable().optional(),
});

export type PortalCloseAttendanceSessionInput = z.infer<
  typeof portalCloseAttendanceSessionSchema
>;
