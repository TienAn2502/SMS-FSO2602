import { z } from 'zod';

import { isoDateSchema } from '@/common/schemas/academic.schema';
import { exportFileFormatSchema } from '@/modules/exports/schemas/students-export.schema';

export const exportAttendanceQuerySchema = z.object({
  format: exportFileFormatSchema.default('xlsx'),
  courseSectionId: z.string().uuid().optional(),
  teacherId: z.string().uuid().optional(),
  semesterId: z.string().uuid().optional(),
  academicYearId: z.string().uuid().optional(),
  homeroomClassId: z.string().uuid().optional(),
  sessionDate: isoDateSchema.optional(),
  fromDate: isoDateSchema.optional(),
  toDate: isoDateSchema.optional(),
  status: z.enum(['OPEN', 'CLOSED']).optional(),
  sortBy: z.enum(['sessionDate', 'periodNumber']).default('sessionDate'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type ExportAttendanceQuery = z.infer<typeof exportAttendanceQuerySchema>;
