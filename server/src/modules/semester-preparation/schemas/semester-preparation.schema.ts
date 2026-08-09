import { z } from 'zod';

export const prepareSemesterFromSourceSchema = z.object({
  sourceSemesterId: z.uuid('Học kỳ nguồn không hợp lệ'),
  closeSourceSemester: z.boolean().optional(),
});

export const semesterPreparationStatusQuerySchema = z.object({
  sourceSemesterId: z.uuid('Học kỳ nguồn không hợp lệ'),
});

export type PrepareSemesterFromSourceInput = z.infer<
  typeof prepareSemesterFromSourceSchema
>;

export type SemesterPreparationStatusQuery = z.infer<
  typeof semesterPreparationStatusQuerySchema
>;
