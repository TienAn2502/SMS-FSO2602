import { z } from 'zod';

import { academicEntityStatusSchema } from '@/common/schemas/academic.schema';
import { paginationSchema } from '@/common/schemas/shared.schema';

export const ALL_ACADEMIC_PERIODS = 'all' as const;

const academicYearFilterSchema = z.union([
  z.uuid(),
  z.literal(ALL_ACADEMIC_PERIODS),
]);

const semesterFilterSchema = z.union([
  z.uuid(),
  z.literal(ALL_ACADEMIC_PERIODS),
  z.string().trim().min(1).max(20),
]);

export function isSemesterUuid(value: string): boolean {
  return z.uuid().safeParse(value).success;
}

export const listCourseSectionsQuerySchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  status: academicEntityStatusSchema.optional(),
  semesterId: semesterFilterSchema.optional(),
  academicYearId: academicYearFilterSchema.optional(),
  homeroomClassId: z.uuid().optional(),
  subjectId: z.uuid().optional(),
  sortBy: z.enum(['createdAt', 'name', 'code', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type ListCourseSectionsQuery = z.infer<
  typeof listCourseSectionsQuerySchema
>;

export const createCourseSectionSchema = z
  .object({
    semesterId: z.string().uuid('Học kỳ không hợp lệ'),
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

export const copySemesterCourseSectionsSchema = z.object({
  sourceSemesterId: z.uuid('Học kỳ nguồn không hợp lệ'),
  targetSemesterId: z.uuid('Học kỳ đích không hợp lệ'),
});

export type CopySemesterCourseSectionsInput = z.infer<
  typeof copySemesterCourseSectionsSchema
>;
