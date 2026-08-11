import { z } from 'zod';

import { isoDateSchema } from '@/common/schemas/academic.schema';

export const prepareNextYearSchema = z
  .object({
    sourceAcademicYearId: z.uuid('Năm học nguồn không hợp lệ'),
    targetAcademicYearId: z.uuid('Năm học đích không hợp lệ'),
    /** Nếu có: tự tạo ghi danh ACTIVE vào học kỳ này sau khi map lớp. */
    targetSemesterId: z.uuid('Học kỳ đích không hợp lệ').optional(),
    createEnrollments: z.boolean().default(true),
    enrolledAt: isoDateSchema.optional(),
    note: z.string().trim().max(2000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.createEnrollments !== false && !data.targetSemesterId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Cần chọn học kỳ đích khi tạo ghi danh năm sau',
        path: ['targetSemesterId'],
      });
    }
  });

export type PrepareNextYearInput = z.infer<typeof prepareNextYearSchema>;

export const prepareNextYearPreviewQuerySchema = z.object({
  sourceAcademicYearId: z.uuid('Năm học nguồn không hợp lệ'),
  targetAcademicYearId: z.uuid('Năm học đích không hợp lệ'),
  targetSemesterId: z.uuid('Học kỳ đích không hợp lệ').optional(),
});

export type PrepareNextYearPreviewQuery = z.infer<
  typeof prepareNextYearPreviewQuerySchema
>;
