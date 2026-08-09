import { z } from 'zod';

import { academicEntityStatusSchema } from '@/common/schemas/academic.schema';
import { paginationSchema } from '@/common/schemas/shared.schema';

export const subjectEvaluationModeSchema = z.enum(['NUMERIC', 'PASS_FAIL']);

export const listGradeLevelSubjectsQuerySchema = paginationSchema.extend({
  gradeLevelId: z.uuid().optional(),
  subjectId: z.uuid().optional(),
  status: academicEntityStatusSchema.optional(),
  sortBy: z
    .enum([
      'gradeLevelCode',
      'subjectCode',
      'subjectName',
      'periodsPerYear',
      'evaluationMode',
    ])
    .default('gradeLevelCode'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type ListGradeLevelSubjectsQuery = z.infer<
  typeof listGradeLevelSubjectsQuerySchema
>;

export const updateGradeLevelSubjectSchema = z.object({
  periodsPerYear: z
    .number()
    .int('Số tiết phải là số nguyên')
    .min(1, 'Số tiết tối thiểu là 1')
    .max(999, 'Số tiết tối đa là 999')
    .nullable()
    .optional(),
  isRequired: z.boolean().optional(),
  evaluationMode: subjectEvaluationModeSchema.optional(),
});

export type UpdateGradeLevelSubjectInput = z.infer<
  typeof updateGradeLevelSubjectSchema
>;
