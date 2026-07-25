import { z } from 'zod';

import { paginationSchema } from '../../../common/schemas/shared.schema';

export const listGradeLevelsQuerySchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  sortBy: z.enum(['code', 'name']).default('code'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type ListGradeLevelsQuery = z.infer<typeof listGradeLevelsQuerySchema>;

export const createGradeLevelSchema = z.object({
  name: z.string().trim().min(1, 'Tên khối là bắt buộc').max(100),
  code: z.string().trim().min(1, 'Mã khối là bắt buộc').max(20),
});

export type CreateGradeLevelInput = z.infer<typeof createGradeLevelSchema>;

export const updateGradeLevelSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  code: z.string().trim().min(1).max(20).optional(),
});

export type UpdateGradeLevelInput = z.infer<typeof updateGradeLevelSchema>;
