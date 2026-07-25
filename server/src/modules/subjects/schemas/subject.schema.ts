import { z } from 'zod';

import { academicEntityStatusSchema } from '../../../common/schemas/academic.schema';
import { paginationSchema } from '../../../common/schemas/shared.schema';

export const listSubjectsQuerySchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  status: academicEntityStatusSchema.optional(),
  sortBy: z.enum(['code', 'name', 'status']).default('code'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type ListSubjectsQuery = z.infer<typeof listSubjectsQuerySchema>;

export const createSubjectSchema = z.object({
  code: z.string().trim().min(1, 'Mã môn là bắt buộc').max(20),
  name: z.string().trim().min(1, 'Tên môn là bắt buộc').max(255),
  description: z.string().trim().max(2000).optional(),
});

export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;

export const updateSubjectSchema = z.object({
  code: z.string().trim().min(1).max(20).optional(),
  name: z.string().trim().min(1).max(255).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
});

export type UpdateSubjectInput = z.infer<typeof updateSubjectSchema>;

export const updateSubjectStatusSchema = z.object({
  status: academicEntityStatusSchema,
});

export type UpdateSubjectStatusInput = z.infer<
  typeof updateSubjectStatusSchema
>;
