import { z } from 'zod';

import { paginationSchema } from '@/common/schemas/shared.schema';

export const listPlatformSchoolsQuerySchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
});

export type ListPlatformSchoolsQuery = z.infer<
  typeof listPlatformSchoolsQuerySchema
>;

export const createPlatformSchoolSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, 'Mã trường phải có ít nhất 2 ký tự')
    .max(50)
    .regex(
      /^[A-Za-z0-9_-]+$/,
      'Mã trường chỉ được chứa chữ, số, gạch ngang và gạch dưới',
    ),
  name: z.string().trim().min(1, 'Tên trường là bắt buộc').max(255),
  shortName: z.string().trim().max(100).optional(),
  schoolType: z.enum(['TH', 'THCS', 'THPT']).optional(),
  adminEmail: z.string().email('Email admin không đúng định dạng'),
  adminPassword: z
    .string()
    .min(8, 'Mật khẩu admin phải có ít nhất 8 ký tự'),
  adminFullName: z.string().trim().max(255).optional(),
});

export type CreatePlatformSchoolInput = z.infer<
  typeof createPlatformSchoolSchema
>;

export const updatePlatformSchoolSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  shortName: z.string().trim().max(100).nullable().optional(),
  schoolType: z.enum(['TH', 'THCS', 'THPT']).optional(),
  email: z.email('Email không đúng định dạng').nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  address: z.string().nullable().optional(),
});

export type UpdatePlatformSchoolInput = z.infer<
  typeof updatePlatformSchoolSchema
>;

export const updatePlatformSchoolStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']),
});

export type UpdatePlatformSchoolStatusInput = z.infer<
  typeof updatePlatformSchoolStatusSchema
>;

export const createPlatformSchoolAdminSchema = z.object({
  email: z.string().email('Email không đúng định dạng'),
  fullName: z.string().trim().min(1, 'Họ tên là bắt buộc').max(255),
  password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự'),
});

export type CreatePlatformSchoolAdminInput = z.infer<
  typeof createPlatformSchoolAdminSchema
>;
