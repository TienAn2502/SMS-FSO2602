import { z } from 'zod';

import { paginationSchema } from '@/common/schemas/shared.schema';
import { isValidScoreStep } from '@/common/utils/score-step.util';
import { assessmentTypeSchema } from '@/modules/assessments/schemas/assessment.schema';

export const portalPatchGradebookScoreChangeSchema = z.object({
  assessmentId: z.uuid('Đầu điểm không hợp lệ'),
  studentId: z.uuid('Học sinh không hợp lệ'),
  score: z
    .number({ error: 'Điểm phải là số' })
    .min(0, 'Điểm tối thiểu là 0')
    .nullable()
    .refine(
      (value) => value == null || isValidScoreStep(value),
      'Điểm chỉ được là số nguyên hoặc .25, .5, .75',
    ),
  note: z.string().trim().max(2000).nullable().optional(),
});

export const portalPatchGradebookScoresSchema = z
  .object({
    changes: z
      .array(portalPatchGradebookScoreChangeSchema)
      .min(1, 'Cần ít nhất một thay đổi điểm'),
  })
  .refine(
    (value) => {
      const keys = value.changes.map(
        (row) => `${row.assessmentId}:${row.studentId}`,
      );
      return new Set(keys).size === keys.length;
    },
    { message: 'Thay đổi trùng lặp assessmentId + studentId' },
  );

export type PortalPatchGradebookScoresInput = z.infer<
  typeof portalPatchGradebookScoresSchema
>;

export const portalMyGradebookClassesQuerySchema = z.object({
  academicYearId: z.uuid('Năm học không hợp lệ').optional(),
});

export type PortalMyGradebookClassesQuery = z.infer<
  typeof portalMyGradebookClassesQuerySchema
>;

export const portalMyScoresGridQuerySchema = z.object({
  semesterId: z.union([z.uuid(), z.string().trim().min(1).max(20)]),
  academicYearId: z.uuid('Năm học không hợp lệ').optional(),
});

export type PortalMyScoresGridQuery = z.infer<
  typeof portalMyScoresGridQuerySchema
>;

export const portalMyScoresQuerySchema = paginationSchema.extend({
  semesterId: z.uuid().optional(),
  academicYearId: z.uuid().optional(),
  courseSectionId: z.uuid().optional(),
  subjectId: z.uuid().optional(),
  type: assessmentTypeSchema.optional(),
});

export type PortalMyScoresQuery = z.infer<typeof portalMyScoresQuerySchema>;

export const portalGradebookExportQuerySchema = z.object({
  format: z.enum(['xlsx', 'csv']),
});

export type PortalGradebookExportQuery = z.infer<
  typeof portalGradebookExportQuerySchema
>;
