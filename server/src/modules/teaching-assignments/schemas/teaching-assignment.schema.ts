import { z } from 'zod';

import {
  academicEntityStatusSchema,
  isoDateSchema,
} from '@/common/schemas/academic.schema';
import { paginationSchema } from '@/common/schemas/shared.schema';

export const listTeachingAssignmentsQuerySchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  teacherId: z.uuid().optional(),
  courseSectionId: z.uuid().optional(),
  semesterId: z.uuid().optional(),
  academicYearId: z.uuid().optional(),
  status: academicEntityStatusSchema.optional(),
  includeAllSemesters: z.coerce.boolean().optional().default(false),
  sortBy: z.enum(['assignAt', 'status']).default('assignAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type ListTeachingAssignmentsQuery = z.infer<
  typeof listTeachingAssignmentsQuerySchema
>;

export const createTeachingAssignmentSchema = z.object({
  teacherId: z.uuid('Giáo viên không hợp lệ'),
  courseSectionId: z.uuid('Lớp môn không hợp lệ'),
  assignAt: isoDateSchema,
});

export type CreateTeachingAssignmentInput = z.infer<
  typeof createTeachingAssignmentSchema
>;

export const updateTeachingAssignmentStatusSchema = z
  .object({
    status: academicEntityStatusSchema,
    endAt: isoDateSchema.optional(),
  })
  .superRefine((value, ctx) => {
    // Nếu trạng thái là INACTIVE và không có endAt, thì không có vấn đề
    if (value.status === 'INACTIVE' && !value.endAt) {
      return;
    }

    if (value.status === 'ACTIVE' && value.endAt) {
      ctx.addIssue({
        code: 'custom',
        message: 'Không thể gửi endAt khi kích hoạt lại phân công',
        path: ['endAt'],
      });
    }
  });

export type UpdateTeachingAssignmentStatusInput = z.infer<
  typeof updateTeachingAssignmentStatusSchema
>;

export const copySemesterTeachingAssignmentsSchema = z.object({
  sourceSemesterId: z.uuid('Học kỳ nguồn không hợp lệ'),
  targetSemesterId: z.uuid('Học kỳ đích không hợp lệ'),
});

export type CopySemesterTeachingAssignmentsInput = z.infer<
  typeof copySemesterTeachingAssignmentsSchema
>;
