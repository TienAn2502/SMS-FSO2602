import { z } from 'zod';

export const updateSchoolSchema = z.object({
  name: z.string().min(1, 'Tên trường là bắt buộc').max(255).optional(),
  shortName: z.string().max(100).nullable().optional(),
  schoolType: z.enum(['TH', 'THCS', 'THPT', 'OTHER']).optional(),
  email: z.email('Email không đúng định dạng').nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  address: z.string().nullable().optional(),
  logoFileId: z.uuid('Logo file ID không hợp lệ').nullable().optional(),
});

export type UpdateSchoolInput = z.infer<typeof updateSchoolSchema>;
