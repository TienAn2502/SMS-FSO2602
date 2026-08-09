import { z } from 'zod';

export interface TeachingAssignmentImportRowError {
  row: number;
  field: string;
  message: string;
}

export interface TeachingAssignmentImportResult {
  successCount: number;
  errorCount: number;
  created: number;
  updated: number;
  errors: TeachingAssignmentImportRowError[];
}

export const importTeachingAssignmentsFormSchema = z.object({
  semesterId: z.uuid('Học kỳ không hợp lệ'),
});

export type ImportTeachingAssignmentsFormInput = z.infer<
  typeof importTeachingAssignmentsFormSchema
>;

export const teachingAssignmentsImportTemplateQuerySchema = z.object({
  semesterId: z.uuid().optional(),
});

export type TeachingAssignmentsImportTemplateQuery = z.infer<
  typeof teachingAssignmentsImportTemplateQuerySchema
>;

export const teachingAssignmentImportRowSchema = z.object({
  email_gv: z.email('Email giáo viên không đúng định dạng'),
  ma_lop_mon: z.string().trim().min(1, 'Mã lớp môn là bắt buộc').max(50),
  ngay_phan_cong: z
    .string()
    .trim()
    .min(1, 'Ngày phân công là bắt buộc')
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      'Ngày phân công phải theo định dạng YYYY-MM-DD',
    ),
});

export type TeachingAssignmentImportRow = z.infer<
  typeof teachingAssignmentImportRowSchema
>;
