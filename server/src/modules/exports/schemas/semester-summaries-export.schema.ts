import { z } from 'zod';

import { exportFileFormatSchema } from '@/modules/exports/schemas/students-export.schema';

export const exportSemesterSummariesQuerySchema = z.object({
  format: exportFileFormatSchema.default('xlsx'),
  semesterId: z.string().uuid().optional(),
  homeroomClassId: z.string().uuid().optional(),
  status: z.enum(['DRAFT', 'CLOSED']).optional(),
  search: z.string().trim().optional(),
  sortBy: z.enum(['overallAverage', 'createdAt']).default('overallAverage'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type ExportSemesterSummariesQuery = z.infer<
  typeof exportSemesterSummariesQuerySchema
>;
