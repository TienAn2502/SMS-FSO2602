import { z } from 'zod';

import {
  academicEntityStatusSchema,
  isoDateSchema,
} from '@/common/schemas/academic.schema';
import { paginationSchema } from '@/common/schemas/shared.schema';
import { genderSchema } from '@/modules/students/schemas/student.schema';

export const listTeachersQuerySchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  status: academicEntityStatusSchema.optional(),
  /**
   * Chỉ GV chưa làm GVCN lớp ACTIVE trong năm học này
   * (GV mới / GVCN năm trước như lớp 12 đã hết năm vẫn hiện).
   */
  availableAsHomeroomForAcademicYearId: z.uuid().optional(),
  /** Khi sửa lớp: vẫn hiện GVCN hiện tại của lớp này. */
  excludeHomeroomClassId: z.uuid().optional(),
  sortBy: z.enum(['fullName', 'status']).default('fullName'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type ListTeachersQuery = z.infer<typeof listTeachersQuerySchema>;

const teacherProfileFieldsSchema = z.object({
  fullName: z.string().trim().min(1, 'Họ tên là bắt buộc').max(255),
  dateOfBirth: isoDateSchema.optional(),
  gender: genderSchema.optional(),
  phone: z.string().trim().max(11).optional(),
  address: z.string().trim().max(2000).optional(),
  specialization: z.string().trim().max(255).optional(),
});

export const createTeacherAccountSchema = z.object({
  email: z.email('Email không đúng định dạng').optional(),
  password: z.string().min(8).optional(),
});

export const createTeacherSchema = teacherProfileFieldsSchema
  .extend({
    createLogin: z.boolean().optional(),
    account: createTeacherAccountSchema.optional(),
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

export type CreateTeacherInput = z.infer<typeof createTeacherSchema>;

export const updateTeacherSchema = z.object({
  fullName: z.string().trim().min(1).max(255).optional(),
  dateOfBirth: isoDateSchema.nullable().optional(),
  gender: genderSchema.nullable().optional(),
  phone: z.string().trim().max(11).nullable().optional(),
  address: z.string().trim().max(2000).nullable().optional(),
  specialization: z.string().trim().max(255).nullable().optional(),
});

export type UpdateTeacherInput = z.infer<typeof updateTeacherSchema>;

export const updateTeacherStatusSchema = z.object({
  status: academicEntityStatusSchema,
});

export type UpdateTeacherStatusInput = z.infer<
  typeof updateTeacherStatusSchema
>;

export const linkTeacherUserSchema = z.object({
  userId: z.uuid('User ID không hợp lệ'),
});

export type LinkTeacherUserInput = z.infer<typeof linkTeacherUserSchema>;

export const createTeacherUserSchema = z.object({}).default({});

export type CreateTeacherUserInput = z.infer<typeof createTeacherUserSchema>;
