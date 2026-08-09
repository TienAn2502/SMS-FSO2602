import { z } from 'zod';

import { isoDateSchema } from '@/common/schemas/academic.schema';
import { paginationSchema } from '@/common/schemas/shared.schema';

export const assessmentTypeSchema = z.enum(['REGULAR', 'MIDTERM', 'FINAL']);
export const assessmentStatusSchema = z.enum(['OPEN', 'CLOSED']);

export const listAssessmentsQuerySchema = paginationSchema.extend({
  courseSectionId: z.uuid().optional(),
  teacherId: z.uuid().optional(),
  semesterId: z.uuid().optional(),
  academicYearId: z.uuid().optional(),
  homeroomClassId: z.uuid().optional(),
  type: assessmentTypeSchema.optional(),
  status: assessmentStatusSchema.optional(),
  assessmentDateFrom: isoDateSchema.optional(),
  assessmentDateTo: isoDateSchema.optional(),
  sortBy: z
    .enum(['assessmentDate', 'name', 'type', 'status'])
    .default('assessmentDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type ListAssessmentsQuery = z.infer<typeof listAssessmentsQuerySchema>;

export const gradebookOverviewStatusSchema = z.enum([
  'NOT_STARTED',
  'IN_PROGRESS',
  'LOCKED',
]);

export const listGradebookOverviewQuerySchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  semesterId: z.uuid().optional(),
  academicYearId: z.uuid().optional(),
  homeroomClassId: z.uuid().optional(),
  subjectId: z.uuid().optional(),
  teacherId: z.uuid().optional(),
  gradebookStatus: gradebookOverviewStatusSchema.optional(),
  sortBy: z
    .enum(['code', 'name', 'assessmentCount', 'scoredCount'])
    .default('code'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type ListGradebookOverviewQuery = z.infer<
  typeof listGradebookOverviewQuerySchema
>;

export const createAssessmentSchema = z.object({
  courseSectionId: z.uuid('Lớp môn không hợp lệ'),
  teacherId: z.uuid('Giáo viên không hợp lệ'),
  type: assessmentTypeSchema,
  name: z.string().trim().min(1).max(255),
  assessmentDate: isoDateSchema,
  maxScore: z.number().positive().max(1000).default(10),
  note: z.string().trim().max(2000).nullable().optional(),
});

export type CreateAssessmentInput = z.infer<typeof createAssessmentSchema>;

export const updateAssessmentSchema = z
  .object({
    status: assessmentStatusSchema.optional(),
    note: z.string().trim().max(2000).nullable().optional(),
  })
  .refine((value) => value.status !== undefined || value.note !== undefined, {
    message: 'Cần ít nhất một trường để cập nhật',
  });

export type UpdateAssessmentInput = z.infer<typeof updateAssessmentSchema>;
