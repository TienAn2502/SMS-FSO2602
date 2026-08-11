import { z } from 'zod';

export const importCourseSectionsFormSchema = z.object({
  semesterId: z.uuid('Học kỳ không hợp lệ'),
});

export type ImportCourseSectionsFormInput = z.infer<
  typeof importCourseSectionsFormSchema
>;

export interface CourseSectionImportRowError {
  sheet: string;
  row: number;
  field: string;
  message: string;
}

export interface CourseSectionImportResult {
  successCount: number;
  errorCount: number;
  created: number;
  skippedExisting: number;
  assignmentsCreated: number;
  errors: CourseSectionImportRowError[];
}

export const courseSectionImportRowSchema = z.object({
  ma_mon: z.string().trim().min(1, 'Mã môn là bắt buộc').max(30),
  ten_lop_mon: z.string().trim().max(100).optional(),
  ma_lop_mon: z.string().trim().max(30).optional(),
  email_gv: z.email('Email giáo viên không đúng định dạng').optional(),
});

export type CourseSectionImportRow = z.infer<
  typeof courseSectionImportRowSchema
>;

export const courseSectionsImportTemplateQuerySchema = z.object({
  semesterId: z.uuid().optional(),
});

export type CourseSectionsImportTemplateQuery = z.infer<
  typeof courseSectionsImportTemplateQuerySchema
>;
