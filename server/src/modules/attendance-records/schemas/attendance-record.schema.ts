import { z } from 'zod';

export const attendanceRecordStatusSchema = z.enum([
  'PRESENT',
  'ABSENT',
  'LATE',
  'EXCUSED',
]);

export const attendanceRecordItemSchema = z.object({
  studentId: z.uuid('Học sinh không hợp lệ'),
  status: attendanceRecordStatusSchema,
  note: z.string().trim().max(2000).nullable().optional(),
});

export const bulkUpsertAttendanceRecordsSchema = z
  .object({
    records: z
      .array(attendanceRecordItemSchema)
      .min(1, 'Cần ít nhất một bản ghi điểm danh'),
  })
  .refine(
    (value) => {
      const ids = value.records.map((record) => record.studentId);
      return new Set(ids).size === ids.length;
    },
    { message: 'studentId trùng lặp trong records' },
  );

export type BulkUpsertAttendanceRecordsInput = z.infer<
  typeof bulkUpsertAttendanceRecordsSchema
>;

export const updateAttendanceRecordSchema = z
  .object({
    status: attendanceRecordStatusSchema.optional(),
    note: z.string().trim().max(2000).nullable().optional(),
  })
  .refine((value) => value.status !== undefined || value.note !== undefined, {
    message: 'Cần ít nhất một trường để cập nhật',
  });

export type UpdateAttendanceRecordInput = z.infer<
  typeof updateAttendanceRecordSchema
>;
