import { z } from 'zod';

import { genderSchema } from '@/modules/students/schemas/student.schema';

export const importClassPlacementFormSchema = z.object({
  academicYearId: z.uuid('Năm học không hợp lệ'),
  semesterId: z.uuid('Học kỳ không hợp lệ'),
});

export type ImportClassPlacementFormInput = z.infer<
  typeof importClassPlacementFormSchema
>;

export interface ClassPlacementImportRowError {
  sheet: string;
  row: number;
  field: string;
  message: string;
}

export interface ClassPlacementImportResult {
  successCount: number;
  errorCount: number;
  created: number;
  updated: number;
  classesCreated: number;
  classesExisting: number;
  errors: ClassPlacementImportRowError[];
}

export const classPlacementImportRowSchema = z.object({
  ho_ten: z.string().trim().min(1, 'Họ tên là bắt buộc').max(255),
  ngay_sinh: z
    .string()
    .trim()
    .min(1, 'Ngày sinh là bắt buộc')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày sinh phải theo định dạng YYYY-MM-DD'),
  gioi_tinh: genderSchema.optional(),
  email: z.email('Email không đúng định dạng').optional(),
  mat_khau: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự').optional(),
  external_code: z.string().trim().max(50).optional(),
});

export type ClassPlacementImportRow = z.infer<
  typeof classPlacementImportRowSchema
>;

export const classPlacementImportTemplateQuerySchema = z.object({
  academicYearId: z.uuid().optional(),
  semesterId: z.uuid().optional(),
});

export type ClassPlacementImportTemplateQuery = z.infer<
  typeof classPlacementImportTemplateQuerySchema
>;
