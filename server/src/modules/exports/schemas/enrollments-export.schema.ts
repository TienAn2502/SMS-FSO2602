import { z } from 'zod';

import { exportFileFormatSchema } from '@/modules/exports/schemas/students-export.schema';

export const exportEnrollmentsQuerySchema = z.object({
  format: exportFileFormatSchema.default('xlsx'),
  studentId: z.string().uuid().optional(),
  semesterId: z.string().uuid().optional(),
  academicYearId: z.string().uuid().optional(),
  homeroomClassId: z.string().uuid().optional(),
  status: z
    .enum([
      'ACTIVE',
      'TRANSFERRED',
      'WITHDRAWN',
      'SEMESTER_COMPLETED',
      'COMPLETED',
    ])
    .optional(),
  sortBy: z.enum(['enrolledAt', 'createdAt', 'status']).default('enrolledAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type ExportEnrollmentsQuery = z.infer<typeof exportEnrollmentsQuerySchema>;
