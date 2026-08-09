import { z } from 'zod';

import { academicEntityStatusSchema } from '@/common/schemas/academic.schema';
import { exportFileFormatSchema } from '@/modules/exports/schemas/students-export.schema';

export const exportTeachersQuerySchema = z.object({
  format: exportFileFormatSchema.default('xlsx'),
  search: z.string().trim().optional(),
  status: academicEntityStatusSchema.optional(),
  sortBy: z.enum(['fullName', 'status']).default('fullName'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type ExportTeachersQuery = z.infer<typeof exportTeachersQuerySchema>;
