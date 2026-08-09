import { z } from 'zod';

import { exportFileFormatSchema } from '@/modules/exports/schemas/students-export.schema';

export const exportYearSummariesQuerySchema = z.object({
  format: exportFileFormatSchema.default('xlsx'),
  academicYearId: z.string().uuid().optional(),
  homeroomClassId: z.string().uuid().optional(),
  promotionDecision: z
    .enum(['PENDING', 'PROMOTED', 'RETAINED', 'GRADUATED'])
    .optional(),
  status: z.enum(['DRAFT', 'CLOSED']).optional(),
  search: z.string().trim().optional(),
  sortBy: z.enum(['overallAverage', 'createdAt']).default('overallAverage'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type ExportYearSummariesQuery = z.infer<
  typeof exportYearSummariesQuerySchema
>;
