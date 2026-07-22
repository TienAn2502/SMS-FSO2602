import { z } from 'zod';

import { paginationSchema } from '../../../common/schemas/shared.schema';

export const listUsersQuerySchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  sortBy: z
    .enum(['createdAt', 'fullName', 'email', 'role', 'status'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  status: z.enum(['ACTIVE', 'INACTIVE', 'LOCKED']).optional(),
  role: z.enum(['SCHOOL_ADMIN', 'TEACHER', 'STUDENT']).optional(),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

export const createUserSchema = z.object({
  email: z.string().email('Email không đúng định dạng'),
  fullName: z.string().min(1, 'Họ tên là bắt buộc').max(255),
  password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự'),
  role: z.enum(['SCHOOL_ADMIN', 'TEACHER', 'STUDENT']),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  fullName: z.string().min(1).max(255).optional(),
  role: z.enum(['SCHOOL_ADMIN', 'TEACHER', 'STUDENT']).optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const updateUserStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'LOCKED']),
});

export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
