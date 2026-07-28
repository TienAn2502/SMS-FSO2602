import { z } from 'zod';

import {
  academicEntityStatusSchema,
  isoDateSchema,
} from '../../../common/schemas/academic.schema';
import { paginationSchema } from '../../../common/schemas/shared.schema';

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

export const createStudentAccountSchema = z.object({
  email: z.email('Email không đúng định dạng'),
  password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự'),
});

export const createStudentSchema = studentProfileFieldsSchema.extend({
  account: createStudentAccountSchema.optional(),
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

export const createStudentUserSchema = createStudentAccountSchema;

export type CreateStudentUserInput = z.infer<typeof createStudentUserSchema>;
