import { z } from 'zod';

import { genderSchema } from '@/modules/students/schemas/student.schema';

export const importStudentsFormSchema = z.object({
  academicYearId: z.uuid('Năm học không hợp lệ'),
  semesterId: z.uuid('Học kỳ không hợp lệ'),
});

export type ImportStudentsFormInput = z.infer<typeof importStudentsFormSchema>;

export interface StudentImportRowError {
  row: number;
  field: string;
  message: string;
}

export interface StudentImportResult {
  successCount: number;
  errorCount: number;
  created: number;
  updated: number;
  errors: StudentImportRowError[];
}

export const studentImportRowSchema = z.object({
  ho_ten: z.string().trim().min(1, 'Họ tên là bắt buộc').max(255),
  ngay_sinh: z
    .string()
    .trim()
    .min(1, 'Ngày sinh là bắt buộc')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày sinh phải theo định dạng YYYY-MM-DD'),
  gioi_tinh: genderSchema.optional(),
  email: z.email('Email không đúng định dạng').optional(),
  mat_khau: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự').optional(),
  ma_lop_hc: z.string().trim().min(1, 'Mã lớp HC là bắt buộc').max(50),
  external_code: z.string().trim().max(50).optional(),
});

export type StudentImportRow = z.infer<typeof studentImportRowSchema>;

export const studentsImportTemplateQuerySchema = z.object({
  academicYearId: z.uuid().optional(),
});

export type StudentsImportTemplateQuery = z.infer<
  typeof studentsImportTemplateQuerySchema
>;
