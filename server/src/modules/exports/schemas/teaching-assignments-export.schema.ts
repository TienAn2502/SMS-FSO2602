import { z } from 'zod';

import { academicEntityStatusSchema } from '@/common/schemas/academic.schema';
import { exportFileFormatSchema } from '@/modules/exports/schemas/students-export.schema';

export const exportTeachingAssignmentsQuerySchema = z.object({
  format: exportFileFormatSchema.default('xlsx'),
  search: z.string().trim().optional(),
  status: academicEntityStatusSchema.optional(),
  teacherId: z.string().uuid().optional(),
  semesterId: z.string().uuid().optional(),
  academicYearId: z.string().uuid().optional(),
  sortBy: z
    .enum(['createdAt', 'assignAt', 'status'])
    .default('assignAt'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type ExportTeachingAssignmentsQuery = z.infer<
  typeof exportTeachingAssignmentsQuerySchema
>;
