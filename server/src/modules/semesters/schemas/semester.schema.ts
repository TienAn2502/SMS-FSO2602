import { z } from 'zod';

import {
  academicEntityStatusSchema,
  isoDateSchema,
} from '@/common/schemas/academic.schema';

export const createSemesterSchema = z
  .object({
    name: z.string().trim().min(1, 'Tên học kỳ là bắt buộc').max(50),
    code: z.string().trim().min(1, 'Mã học kỳ là bắt buộc').max(20),
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

export type CreateSemesterInput = z.infer<typeof createSemesterSchema>;

export const updateSemesterSchema = z
  .object({
    name: z.string().trim().min(1).max(50).optional(),
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

export type UpdateSemesterInput = z.infer<typeof updateSemesterSchema>;

export const updateSemesterStatusSchema = z.object({
  status: academicEntityStatusSchema,
});

export type UpdateSemesterStatusInput = z.infer<
  typeof updateSemesterStatusSchema
>;
