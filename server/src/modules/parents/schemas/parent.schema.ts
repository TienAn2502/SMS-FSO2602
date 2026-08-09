import { z } from 'zod';

import { academicEntityStatusSchema } from '@/common/schemas/academic.schema';
import { paginationSchema } from '@/common/schemas/shared.schema';

export const parentRelationshipSchema = z.enum([
  'FATHER',
  'MOTHER',
  'GUARDIAN',
  'OTHER',
]);

export const listParentsQuerySchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  status: academicEntityStatusSchema.optional(),
  sortBy: z.enum(['fullName', 'status']).default('fullName'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type ListParentsQuery = z.infer<typeof listParentsQuerySchema>;

export const createParentAccountSchema = z.object({
  email: z.email('Email không đúng định dạng'),
  password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự'),
});

export const createParentSchema = z.object({
  fullName: z.string().trim().min(1, 'Họ tên là bắt buộc').max(255),
  phone: z.string().trim().max(11).optional(),
  account: createParentAccountSchema.optional(),
});

export type CreateParentInput = z.infer<typeof createParentSchema>;

export const updateParentSchema = z.object({
  fullName: z.string().trim().min(1).max(255).optional(),
  phone: z.string().trim().max(11).nullable().optional(),
});

export type UpdateParentInput = z.infer<typeof updateParentSchema>;

export const updateParentStatusSchema = z.object({
  status: academicEntityStatusSchema,
});

export type UpdateParentStatusInput = z.infer<typeof updateParentStatusSchema>;

export const linkParentUserSchema = z.object({
  userId: z.uuid('User ID không hợp lệ'),
});

export type LinkParentUserInput = z.infer<typeof linkParentUserSchema>;

export const createParentUserSchema = createParentAccountSchema;

export type CreateParentUserInput = z.infer<typeof createParentUserSchema>;

export const linkParentStudentSchema = z.object({
  studentId: z.uuid('Học sinh không hợp lệ'),
  relationship: parentRelationshipSchema,
  isPrimaryContact: z.boolean().optional().default(false),
});

export type LinkParentStudentInput = z.infer<typeof linkParentStudentSchema>;
