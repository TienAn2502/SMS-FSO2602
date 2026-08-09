import { z } from 'zod';

import { paginationSchema } from '@/common/schemas/shared.schema';

export const trainingResultLevelSchema = z.enum([
  'GOOD',
  'FAIR',
  'SATISFACTORY',
  'UNSATISFACTORY',
]);

export const bulkConductRecordItemSchema = z.object({
  studentId: z.uuid('Học sinh không hợp lệ'),
  trainingResultLevel: trainingResultLevelSchema,
  note: z.string().trim().max(2000).optional(),
});

export const bulkUpsertConductRecordsSchema = z
  .object({
    semesterId: z.uuid('Học kỳ không hợp lệ'),
    homeroomClassId: z.uuid('Lớp chủ nhiệm không hợp lệ'),
    records: z
      .array(bulkConductRecordItemSchema)
      .min(1, 'Danh sách hạnh kiểm không được rỗng'),
  })
  .refine(
    (value) => {
      const studentIds = value.records.map((row) => row.studentId);
      return new Set(studentIds).size === studentIds.length;
    },
    { message: 'Không được trùng học sinh trong danh sách', path: ['records'] },
  );

export const listConductRecordsQuerySchema = paginationSchema.extend({
  semesterId: z.uuid('Học kỳ không hợp lệ'),
  homeroomClassId: z.uuid('Lớp chủ nhiệm không hợp lệ').optional(),
  status: z.enum(['DRAFT', 'CLOSED']).optional(),
  search: z.string().trim().optional(),
});

export const finalizeConductRecordsSchema = z.object({
  homeroomClassId: z.uuid('Lớp chủ nhiệm không hợp lệ'),
});

export type BulkUpsertConductRecordsInput = z.infer<
  typeof bulkUpsertConductRecordsSchema
>;
export type ListConductRecordsQuery = z.infer<
  typeof listConductRecordsQuerySchema
>;
export type FinalizeConductRecordsInput = z.infer<
  typeof finalizeConductRecordsSchema
>;
