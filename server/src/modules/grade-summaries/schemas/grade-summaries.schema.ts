import { z } from 'zod';

export const recomputeGradeSummariesSchema = z.object({
  semesterId: z.uuid('Học kỳ không hợp lệ'),
});

export type RecomputeGradeSummariesInput = z.infer<
  typeof recomputeGradeSummariesSchema
>;
