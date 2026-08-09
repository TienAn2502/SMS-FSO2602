import { z } from 'zod';

import { academicEntityStatusSchema } from '@/common/schemas/academic.schema';
import { exportFileFormatSchema } from '@/modules/exports/schemas/students-export.schema';

export const exportHomeroomClassesQuerySchema = z.object({
  format: exportFileFormatSchema.default('xlsx'),
  search: z.string().trim().optional(),
  status: academicEntityStatusSchema.optional(),
  academicYearId: z.string().uuid().optional(),
  gradeLevelId: z.string().uuid().optional(),
  sortBy: z
    .enum(['createdAt', 'name', 'code', 'status'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type ExportHomeroomClassesQuery = z.infer<
  typeof exportHomeroomClassesQuerySchema
>;
