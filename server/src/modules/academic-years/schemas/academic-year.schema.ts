import { z } from 'zod';

import {
  academicEntityStatusSchema,
  isoDateSchema,
} from '@/common/schemas/academic.schema';
import { paginationSchema } from '@/common/schemas/shared.schema';

export const listAcademicYearsQuerySchema = paginationSchema.extend({
  status: academicEntityStatusSchema.optional(),
  sortBy: z
    .enum(['createdAt', 'startDate', 'name', 'code', 'status'])
    .default('startDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type ListAcademicYearsQuery = z.infer<
  typeof listAcademicYearsQuerySchema
>;

export const createAcademicYearSchema = z
  .object({
    name: z.string().trim().min(1, 'Tên năm học là bắt buộc').max(100),
    code: z.string().trim().min(1, 'Mã năm học là bắt buộc').max(20),
    startDate: isoDateSchema,
    endDate: isoDateSchema,
    isCurrent: z.boolean().default(false),
  })
  .superRefine((value, ctx) => {
    if (value.endDate <= value.startDate) {
      ctx.addIssue({
        code: 'custom',
        message: 'Ngày kết thúc phải sau ngày bắt đầu',
        path: ['endDate'],
      });
    }
  });

export type CreateAcademicYearInput = z.infer<typeof createAcademicYearSchema>;

export const updateAcademicYearSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    code: z.string().trim().min(1).max(20).optional(),
    startDate: isoDateSchema.optional(),
    endDate: isoDateSchema.optional(),
    isCurrent: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.startDate && value.endDate && value.endDate <= value.startDate) {
      ctx.addIssue({
        code: 'custom',
        message: 'Ngày kết thúc phải sau ngày bắt đầu',
        path: ['endDate'],
      });
    }
  });

export type UpdateAcademicYearInput = z.infer<typeof updateAcademicYearSchema>;

export const updateAcademicYearStatusSchema = z.object({
  status: academicEntityStatusSchema,
});

export type UpdateAcademicYearStatusInput = z.infer<
  typeof updateAcademicYearStatusSchema
>;
