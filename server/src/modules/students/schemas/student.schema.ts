import { z } from 'zod';

import {
  academicEntityStatusSchema,
  isoDateSchema,
} from '@/common/schemas/academic.schema';
import { paginationSchema } from '@/common/schemas/shared.schema';

export const genderSchema = z.enum(['MALE', 'FEMALE', 'OTHER']);

export const listStudentsQuerySchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  status: academicEntityStatusSchema.optional(),
  homeroomClassId: z.string().uuid().optional(),
  semesterId: z.string().uuid().optional(),
  academicYearId: z.string().uuid().optional(),
  sortBy: z.enum(['fullName', 'createdAt', 'status']).default('fullName'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type ListStudentsQuery = z.infer<typeof listStudentsQuerySchema>;

const studentProfileFieldsSchema = z.object({
  fullName: z.string().trim().min(1, 'Họ tên là bắt buộc').max(255),
  dateOfBirth: isoDateSchema.optional(),
  gender: genderSchema.optional(),
  phone: z.string().trim().max(20).optional(),
  address: z.string().trim().max(2000).optional(),
});

/** @deprecated Giữ tương thích — ưu tiên createLogin */
export const createStudentAccountSchema = z.object({
  email: z.email('Email không đúng định dạng').optional(),
  password: z.string().min(8).optional(),
});

export const createStudentSchema = studentProfileFieldsSchema
  .extend({
    /** Tạo tài khoản: đăng nhập bằng mã HS, mật khẩu = mã + ngày sinh */
    createLogin: z.boolean().optional(),
    account: createStudentAccountSchema.optional(),
  })
  .superRefine((value, ctx) => {
    const wantsLogin = Boolean(value.createLogin || value.account);
    if (wantsLogin && !value.dateOfBirth) {
      ctx.addIssue({
        code: 'custom',
        message: 'Ngày sinh là bắt buộc khi tạo tài khoản đăng nhập',
        path: ['dateOfBirth'],
      });
    }
  });

export type CreateStudentInput = z.infer<typeof createStudentSchema>;

export const updateStudentSchema = z.object({
  fullName: z.string().trim().min(1).max(255).optional(),
  dateOfBirth: isoDateSchema.nullable().optional(),
  gender: genderSchema.nullable().optional(),
  phone: z.string().trim().max(20).nullable().optional(),
  address: z.string().trim().max(2000).nullable().optional(),
});

export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;

export const updateStudentStatusSchema = z.object({
  status: academicEntityStatusSchema,
});

export type UpdateStudentStatusInput = z.infer<
  typeof updateStudentStatusSchema
>;

export const linkStudentUserSchema = z.object({
  userId: z.uuid('User ID không hợp lệ'),
});

export type LinkStudentUserInput = z.infer<typeof linkStudentUserSchema>;

export const createStudentUserSchema = z.object({}).default({});

export type CreateStudentUserInput = z.infer<typeof createStudentUserSchema>;
