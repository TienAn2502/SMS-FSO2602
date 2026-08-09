import { z } from 'zod';

export interface HomeroomClassImportRowError {
  row: number;
  field: string;
  message: string;
}

export interface HomeroomClassImportResult {
  successCount: number;
  errorCount: number;
  created: number;
  updated: number;
  errors: HomeroomClassImportRowError[];
}

export const importHomeroomClassesFormSchema = z.object({
  academicYearId: z.uuid('Năm học không hợp lệ'),
});

export type ImportHomeroomClassesFormInput = z.infer<
  typeof importHomeroomClassesFormSchema
>;

export const homeroomClassesImportTemplateQuerySchema = z.object({
  academicYearId: z.uuid().optional(),
});

export type HomeroomClassesImportTemplateQuery = z.infer<
  typeof homeroomClassesImportTemplateQuerySchema
>;

export const homeroomClassImportRowSchema = z.object({
  ma_lop_hc: z.string().trim().min(1, 'Mã lớp HC là bắt buộc').max(20),
  ten_lop: z.string().trim().min(1, 'Tên lớp là bắt buộc').max(100),
  ma_khoi: z.string().trim().min(1, 'Mã khối là bắt buộc').max(20),
  si_so: z.coerce.number().int().positive().optional(),
  email_gvcn: z.email('Email GVCN không đúng định dạng').optional(),
});

export type HomeroomClassImportRow = z.infer<typeof homeroomClassImportRowSchema>;
