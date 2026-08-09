import { z } from 'zod';



import { isoDateSchema } from '@/common/schemas/academic.schema';

import { paginationSchema } from '@/common/schemas/shared.schema';



export const enrollmentStatusSchema = z.enum([

  'ACTIVE',

  'TRANSFERRED',

  'WITHDRAWN',

  'SEMESTER_COMPLETED',

  'COMPLETED',

]);



export const listStudentEnrollmentsQuerySchema = paginationSchema.extend({

  studentId: z.uuid().optional(),

  semesterId: z.uuid().optional(),

  academicYearId: z.uuid().optional(),

  homeroomClassId: z.uuid().optional(),

  status: enrollmentStatusSchema.optional(),

  sortBy: z.enum(['enrolledAt', 'createdAt', 'status']).default('enrolledAt'),

  sortOrder: z.enum(['asc', 'desc']).default('desc'),

});



export type ListStudentEnrollmentsQuery = z.infer<

  typeof listStudentEnrollmentsQuerySchema

>;



export const createStudentEnrollmentSchema = z.object({

  studentId: z.uuid('Học sinh không hợp lệ'),

  semesterId: z.uuid('Học kỳ không hợp lệ'),

  homeroomClassId: z.uuid('Lớp hành chính không hợp lệ'),

  enrolledAt: isoDateSchema,

  note: z.string().trim().max(2000).optional(),

});



export type CreateStudentEnrollmentInput = z.infer<

  typeof createStudentEnrollmentSchema

>;



export const transferStudentEnrollmentSchema = z.object({

  targetHomeroomClassId: z.uuid('Lớp hành chính không hợp lệ'),

  transferredAt: isoDateSchema,

  note: z.string().trim().max(2000).optional(),

});



export type TransferStudentEnrollmentInput = z.infer<

  typeof transferStudentEnrollmentSchema

>;



export const withdrawStudentEnrollmentSchema = z.object({

  leftAt: isoDateSchema.optional(),

  note: z.string().trim().max(2000).optional(),

});



export type WithdrawStudentEnrollmentInput = z.infer<

  typeof withdrawStudentEnrollmentSchema

>;



export const copySemesterEnrollmentsSchema = z.object({

  sourceSemesterId: z.uuid('Học kỳ nguồn không hợp lệ'),

  targetSemesterId: z.uuid('Học kỳ đích không hợp lệ'),

  enrolledAt: isoDateSchema.optional(),

  note: z.string().trim().max(2000).optional(),

  closeSourceSemester: z.boolean().optional(),

});



export type CopySemesterEnrollmentsInput = z.infer<

  typeof copySemesterEnrollmentsSchema

>;



export const closeSemesterEnrollmentsSchema = z.object({

  semesterId: z.uuid('Học kỳ không hợp lệ'),

  leftAt: isoDateSchema.optional(),

});



export type CloseSemesterEnrollmentsInput = z.infer<

  typeof closeSemesterEnrollmentsSchema

>;



export const syncStaleEnrollmentsSchema = z.object({

  academicYearId: z.uuid('Năm học không hợp lệ'),

});



export type SyncStaleEnrollmentsInput = z.infer<

  typeof syncStaleEnrollmentsSchema

>;

