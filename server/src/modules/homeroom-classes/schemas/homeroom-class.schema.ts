import { z } from 'zod';

import { academicEntityStatusSchema } from '@/common/schemas/academic.schema';
import { paginationSchema } from '@/common/schemas/shared.schema';

export const listHomeroomClassesQuerySchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  status: academicEntityStatusSchema.optional(),
  academicYearId: z.string().uuid().optional(),
  gradeLevelId: z.string().uuid().optional(),
  sortBy: z.enum(['createdAt', 'name', 'code', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type ListHomeroomClassesQuery = z.infer<
  typeof listHomeroomClassesQuerySchema
>;

export const createHomeroomClassSchema = z.object({
  academicYearId: z.string().uuid('Năm học không hợp lệ'),
  gradeLevelId: z.string().uuid('Khối không hợp lệ'),
  name: z.string().trim().min(1, 'Tên lớp là bắt buộc').max(100),
  code: z.string().trim().min(1, 'Mã lớp là bắt buộc').max(20),
  capacity: z.coerce.number().int().positive().optional(),
  homeroomTeacherId: z.string().uuid().nullable().optional(),
});

export type CreateHomeroomClassInput = z.infer<
  typeof createHomeroomClassSchema
>;

export const updateHomeroomClassSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  code: z.string().trim().min(1).max(20).optional(),
  capacity: z.coerce.number().int().positive().nullable().optional(),
  homeroomTeacherId: z.string().uuid().nullable().optional(),
});

export type UpdateHomeroomClassInput = z.infer<
  typeof updateHomeroomClassSchema
>;

export const updateHomeroomClassStatusSchema = z.object({
  status: academicEntityStatusSchema,
});

export type UpdateHomeroomClassStatusInput = z.infer<
  typeof updateHomeroomClassStatusSchema
>;
