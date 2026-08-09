import { z } from 'zod';

export const recomputeGradeSummariesSchema = z.object({
  semesterId: z.uuid('Học kỳ không hợp lệ'),
  homeroomClassId: z.uuid('Lớp chủ nhiệm không hợp lệ').optional(),
  courseSectionId: z.uuid('Lớp môn không hợp lệ').optional(),
});

export type RecomputeGradeSummariesInput = z.infer<
  typeof recomputeGradeSummariesSchema
>;
