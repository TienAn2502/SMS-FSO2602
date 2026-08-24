import { z } from 'zod';

export interface ScoreImportRowError {
  row: number;
  field: string;
  message: string;
}

export interface ScoreImportResult {
  successCount: number;
  errorCount: number;
  created: number;
  updated: number;
  errors: ScoreImportRowError[];
}

export const importScoresFormSchema = z.object({
  courseSectionId: z.uuid('Lớp môn không hợp lệ'),
  /** Có = import 1 cột diem; bỏ trống = import bảng TX/GK/CK */
  assessmentId: z.uuid('Đầu điểm không hợp lệ').optional(),
});

export type ImportScoresFormInput = z.infer<typeof importScoresFormSchema>;

export const scoresImportTemplateQuerySchema = z.object({
  courseSectionId: z.uuid().optional(),
  assessmentId: z.uuid().optional(),
});

export type ScoresImportTemplateQuery = z.infer<
  typeof scoresImportTemplateQuerySchema
>;

export const scoreImportRowSchema = z.object({
  ma_hs: z.string().trim().min(1, 'Mã HS là bắt buộc').max(50),
  ho_ten: z.string().trim().max(255).optional(),
  diem: z.string().trim().optional(),
  ghi_chu: z.string().trim().max(2000).optional(),
});

export type ScoreImportRow = z.infer<typeof scoreImportRowSchema>;
