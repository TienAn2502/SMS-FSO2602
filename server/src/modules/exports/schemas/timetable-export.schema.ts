import { z } from 'zod';

import { academicEntityStatusSchema } from '@/common/schemas/academic.schema';
import { exportFileFormatSchema } from '@/modules/exports/schemas/students-export.schema';

export const exportTimetableQuerySchema = z.object({
  format: exportFileFormatSchema,
  semesterId: z.uuid().optional(),
  academicYearId: z.uuid().optional(),
  courseSectionId: z.uuid().optional(),
  teacherId: z.uuid().optional(),
  homeroomClassId: z.uuid().optional(),
  subjectId: z.uuid().optional(),
  search: z.string().trim().optional(),
  status: academicEntityStatusSchema.optional(),
});

export type ExportTimetableQuery = z.infer<typeof exportTimetableQuerySchema>;
