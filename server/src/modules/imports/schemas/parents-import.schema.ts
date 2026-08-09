import { z } from 'zod';

import { parentRelationshipSchema } from '@/modules/parents/schemas/parent.schema';

export interface ParentImportRowError {
  row: number;
  field: string;
  message: string;
}

export interface ParentImportResult {
  successCount: number;
  errorCount: number;
  created: number;
  updated: number;
  errors: ParentImportRowError[];
}

export const parentImportRowSchema = z.object({
  ho_ten: z.string().trim().min(1, 'Họ tên là bắt buộc').max(255),
  phone: z.string().trim().max(11).optional(),
  email: z.email('Email không đúng định dạng').optional(),
  mat_khau: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự').optional(),
  ma_hs: z.string().trim().max(50).optional(),
  quan_he: parentRelationshipSchema.optional(),
  lien_he_chinh: z.boolean().optional(),
});

export type ParentImportRow = z.infer<typeof parentImportRowSchema>;
