import { z } from 'zod';

import { isoDateSchema } from '@/common/schemas/academic.schema';
import { paginationSchema } from '@/common/schemas/shared.schema';

export const placementReasonSchema = z.enum(['RETAINED', 'NEW_INTAKE']);

export type PlacementReason = z.infer<typeof placementReasonSchema>;

export const listUnassignedPlacementQuerySchema = paginationSchema.extend({
  semesterId: z.uuid('Học kỳ không hợp lệ'),
  reason: placementReasonSchema.optional(),
  search: z.string().trim().max(200).optional(),
  gradeLevelId: z.uuid('Khối không hợp lệ').optional(),
});

export type ListUnassignedPlacementQuery = z.infer<
  typeof listUnassignedPlacementQuerySchema
>;

export const assignClassPlacementSchema = z.object({
  semesterId: z.uuid('Học kỳ không hợp lệ'),
  assignments: z
    .array(
      z.object({
        studentId: z.uuid('Học sinh không hợp lệ'),
        homeroomClassId: z.uuid('Lớp không hợp lệ'),
      }),
    )
    .min(1, 'Cần ít nhất một học sinh')
    .max(500, 'Tối đa 500 học sinh mỗi lần'),
  enrolledAt: isoDateSchema.optional(),
  note: z.string().trim().max(2000).optional(),
});

export type AssignClassPlacementInput = z.infer<
  typeof assignClassPlacementSchema
>;

export const autoBalanceClassPlacementSchema = z.object({
  semesterId: z.uuid('Học kỳ không hợp lệ'),
  gradeLevelId: z.uuid('Khối không hợp lệ'),
  reason: placementReasonSchema.optional(),
  studentIds: z.array(z.uuid()).max(500).optional(),
  enrolledAt: isoDateSchema.optional(),
  note: z.string().trim().max(2000).optional(),
});

export type AutoBalanceClassPlacementInput = z.infer<
  typeof autoBalanceClassPlacementSchema
>;

export const autoBalancePreviewQuerySchema = z.object({
  semesterId: z.uuid('Học kỳ không hợp lệ'),
  gradeLevelId: z.uuid('Khối không hợp lệ'),
  reason: placementReasonSchema.optional(),
});

export type AutoBalancePreviewQuery = z.infer<
  typeof autoBalancePreviewQuerySchema
>;
