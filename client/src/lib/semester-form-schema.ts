import { z } from 'zod';

export function createSemesterFormSchema(
  academicYearStartDate: string,
  academicYearEndDate: string,
) {
  return z
    .object({
      name: z.string().trim().min(1, 'Tên học kỳ là bắt buộc'),
      code: z.string().trim().min(1, 'Mã học kỳ là bắt buộc'),
      startDate: z.string().min(1, 'Ngày bắt đầu là bắt buộc'),
      endDate: z.string().min(1, 'Ngày kết thúc là bắt buộc'),
    })
    .superRefine((value, ctx) => {
      if (value.endDate <= value.startDate) {
        ctx.addIssue({
          code: 'custom',
          message: 'Ngày kết thúc phải sau ngày bắt đầu',
          path: ['endDate'],
        });
      }

      if (value.startDate < academicYearStartDate) {
        ctx.addIssue({
          code: 'custom',
          message: 'Ngày bắt đầu học kỳ không được trước ngày bắt đầu năm học',
          path: ['startDate'],
        });
      }

      if (value.endDate > academicYearEndDate) {
        ctx.addIssue({
          code: 'custom',
          message: 'Ngày kết thúc học kỳ không được sau ngày kết thúc năm học',
          path: ['endDate'],
        });
      }
    });
}

export type SemesterFormValues = z.infer<
  ReturnType<typeof createSemesterFormSchema>
>;
