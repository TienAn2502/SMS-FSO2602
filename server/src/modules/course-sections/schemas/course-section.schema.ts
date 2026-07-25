import { z } from 'zod';

import { academicEntityStatusSchema } from '../../../common/schemas/academic.schema';
import { paginationSchema } from '../../../common/schemas/shared.schema';

export const listCourseSectionsQuerySchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  status: academicEntityStatusSchema.optional(),
  academicYearId: z.string().uuid().optional(),
  homeroomClassId: z.string().uuid().optional(),
  subjectId: z.string().uuid().optional(),
  sortBy: z.enum(['createdAt', 'name', 'code', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type ListCourseSectionsQuery = z.infer<
  typeof listCourseSectionsQuerySchema
>;

export const createCourseSectionSchema = z
  .object({
    academicYearId: z.string().uuid('Năm học không hợp lệ'),
    subjectId: z.string().uuid('Môn học không hợp lệ'),
    homeroomClassId: z.string().uuid().nullable().optional(),
    gradeLevelId: z.string().uuid().optional(),
    name: z.string().trim().min(1, 'Tên lớp môn là bắt buộc').max(100),
    code: z.string().trim().min(1, 'Mã lớp môn là bắt buộc').max(30),
  })
  .superRefine((value, ctx) => {
    if (!value.homeroomClassId && !value.gradeLevelId) {
      ctx.addIssue({
        code: 'custom',
        message: 'Khối là bắt buộc khi không gắn lớp hành chính',
        path: ['gradeLevelId'],
      });
    }
  });

export type CreateCourseSectionInput = z.infer<
  typeof createCourseSectionSchema
>;

export const updateCourseSectionSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  code: z.string().trim().min(1).max(30).optional(),
  homeroomClassId: z.string().uuid().nullable().optional(),
});

export type UpdateCourseSectionInput = z.infer<
  typeof updateCourseSectionSchema
>;

export const updateCourseSectionStatusSchema = z.object({
  status: academicEntityStatusSchema,
});

export type UpdateCourseSectionStatusInput = z.infer<
  typeof updateCourseSectionStatusSchema
>;
