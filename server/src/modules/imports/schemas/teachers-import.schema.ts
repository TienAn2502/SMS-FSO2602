import { z } from 'zod';

import { genderSchema } from '@/modules/students/schemas/student.schema';

export interface TeacherImportRowError {
  row: number;
  field: string;
  message: string;
}

export interface TeacherImportResult {
  successCount: number;
  errorCount: number;
  created: number;
  updated: number;
  errors: TeacherImportRowError[];
}

export const teacherImportRowSchema = z.object({
  ho_ten: z.string().trim().min(1, 'Họ tên là bắt buộc').max(255),
  ngay_sinh: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày sinh phải theo định dạng YYYY-MM-DD')
    .optional(),
  gioi_tinh: genderSchema.optional(),
  email: z.email('Email không đúng định dạng').optional(),
  mat_khau: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự').optional(),
  phone: z.string().trim().max(11).optional(),
  chuyen_mon: z.string().trim().max(255).optional(),
  dia_chi: z.string().trim().max(2000).optional(),
});

export type TeacherImportRow = z.infer<typeof teacherImportRowSchema>;
