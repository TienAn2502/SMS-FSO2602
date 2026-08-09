import { z } from 'zod';

import { paginationSchema } from '@/common/schemas/shared.schema';

export const listSubjectResultsQuerySchema = paginationSchema.extend({
  semesterId: z.uuid('Học kỳ không hợp lệ').optional(),
  homeroomClassId: z.uuid('Lớp chủ nhiệm không hợp lệ').optional(),
  courseSectionId: z.uuid('Lớp môn không hợp lệ').optional(),
  studentId: z.uuid('Học sinh không hợp lệ').optional(),
  status: z.enum(['DRAFT', 'CLOSED']).optional(),
  search: z.string().trim().optional(),
});

export const listSemesterSummariesQuerySchema = paginationSchema.extend({
  semesterId: z.uuid('Học kỳ không hợp lệ').optional(),
  homeroomClassId: z.uuid('Lớp chủ nhiệm không hợp lệ').optional(),
  status: z.enum(['DRAFT', 'CLOSED']).optional(),
  search: z.string().trim().optional(),
});

export const listYearSummariesQuerySchema = paginationSchema.extend({
  academicYearId: z.uuid('Năm học không hợp lệ').optional(),
  homeroomClassId: z.uuid('Lớp chủ nhiệm không hợp lệ').optional(),
  promotionDecision: z
    .enum(['PENDING', 'PROMOTED', 'RETAINED', 'GRADUATED'])
    .optional(),
  status: z.enum(['DRAFT', 'CLOSED']).optional(),
  search: z.string().trim().optional(),
});

export const finalizeSemesterSummariesSchema = z.object({
  homeroomClassId: z.uuid('Lớp chủ nhiệm không hợp lệ'),
});

export const finalizePromotionSchema = z.object({
  homeroomClassId: z.uuid('Lớp chủ nhiệm không hợp lệ'),
  decisions: z
    .array(
      z.object({
        studentId: z.uuid('Học sinh không hợp lệ'),
        promotionDecision: z.enum([
          'PENDING',
          'PROMOTED',
          'RETAINED',
          'GRADUATED',
        ]),
        nextHomeroomClassId: z.uuid('Lớp năm sau không hợp lệ').optional(),
        note: z.string().trim().max(2000).optional(),
      }),
    )
    .optional(),
});

export const recomputeYearSummariesSchema = z.object({
  homeroomClassId: z.uuid('Lớp chủ nhiệm không hợp lệ').optional(),
});

export const portalSummariesQuerySchema = z.object({
  semesterId: z.uuid('Học kỳ không hợp lệ').optional(),
  academicYearId: z.uuid('Năm học không hợp lệ').optional(),
});

export const portalHomeroomSummariesQuerySchema = z.object({
  semesterId: z.uuid('Học kỳ không hợp lệ'),
  homeroomClassId: z.uuid('Lớp chủ nhiệm không hợp lệ'),
});

export type ListSubjectResultsQuery = z.infer<
  typeof listSubjectResultsQuerySchema
>;
export type ListSemesterSummariesQuery = z.infer<
  typeof listSemesterSummariesQuerySchema
>;
export type ListYearSummariesQuery = z.infer<typeof listYearSummariesQuerySchema>;
export type FinalizeSemesterSummariesInput = z.infer<
  typeof finalizeSemesterSummariesSchema
>;
export type FinalizePromotionInput = z.infer<typeof finalizePromotionSchema>;
export type RecomputeYearSummariesInput = z.infer<
  typeof recomputeYearSummariesSchema
>;
export type PortalSummariesQuery = z.infer<typeof portalSummariesQuerySchema>;
export type PortalHomeroomSummariesQuery = z.infer<
  typeof portalHomeroomSummariesQuerySchema
>;
