import { z } from 'zod';

import { isValidScoreStep } from '@/common/utils/score-step.util';

export const scoreItemSchema = z.object({
  studentId: z.uuid('Học sinh không hợp lệ'),
  score: z
    .number({ error: 'Điểm phải là số' })
    .min(0, 'Điểm tối thiểu là 0')
    .nullable()
    .refine(
      (value) => value == null || isValidScoreStep(value),
      'Điểm chỉ được là số nguyên hoặc .25, .5, .75',
    ),
  note: z.string().trim().max(2000).nullable().optional(),
});

export const bulkUpsertScoresSchema = z
  .object({
    scores: z.array(scoreItemSchema).min(1, 'Cần ít nhất một điểm học sinh'),
  })
  .refine(
    (value) => {
      const ids = value.scores.map((row) => row.studentId);
      return new Set(ids).size === ids.length;
    },
    { message: 'studentId trùng lặp trong scores' },
  );

export type BulkUpsertScoresInput = z.infer<typeof bulkUpsertScoresSchema>;
