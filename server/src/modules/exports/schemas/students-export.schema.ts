import { z } from 'zod';

import { academicEntityStatusSchema } from '@/common/schemas/academic.schema';

export const exportFileFormatSchema = z.enum(['xlsx', 'csv']);

export type ExportFileFormat = z.infer<typeof exportFileFormatSchema>;

export const exportStudentsQuerySchema = z.object({
  format: exportFileFormatSchema.default('xlsx'),
  search: z.string().trim().optional(),
  status: academicEntityStatusSchema.optional(),
  homeroomClassId: z.string().uuid().optional(),
  semesterId: z.string().uuid().optional(),
  academicYearId: z.string().uuid().optional(),
  sortBy: z.enum(['fullName', 'createdAt', 'status']).default('fullName'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type ExportStudentsQuery = z.infer<typeof exportStudentsQuerySchema>;
