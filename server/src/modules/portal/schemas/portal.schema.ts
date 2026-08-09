import { academicEntityStatusSchema } from '@/common/schemas/academic.schema';
import { paginationSchema } from '@/common/schemas/shared.schema';
import { ALL_ACADEMIC_PERIODS } from '@/modules/course-sections/schemas/course-section.schema';
import { z } from 'zod';

const portalAcademicYearFilterSchema = z.uuid();

const portalSemesterFilterSchema = z.union([
  z.uuid(),
  z.string().trim().min(1).max(20),
]);

const listAcademicYearFilterSchema = z.union([
  z.uuid(),
  z.literal(ALL_ACADEMIC_PERIODS),
]);

const listSemesterFilterSchema = z.union([
  z.uuid(),
  z.literal(ALL_ACADEMIC_PERIODS),
  z.string().trim().min(1).max(20),
]);

export const portalTimetableQuerySchema = z.object({
  search: z.string().trim().optional(),
  semesterId: portalSemesterFilterSchema.optional(),
  academicYearId: portalAcademicYearFilterSchema.optional(),
  subjectId: z.uuid().optional(),
  status: academicEntityStatusSchema.optional(),
});

export type PortalTimetableQuery = z.infer<typeof portalTimetableQuerySchema>;

export const portalExportTimetableQuerySchema = portalTimetableQuerySchema.extend({
  format: z.enum(['xlsx', 'csv']),
});

export type PortalExportTimetableQuery = z.infer<
  typeof portalExportTimetableQuerySchema
>;

export const listMyCourseSectionsQuerySchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  status: academicEntityStatusSchema.optional(),
  semesterId: listSemesterFilterSchema.optional(),
  academicYearId: listAcademicYearFilterSchema.optional(),
  homeroomClassId: z.uuid().optional(),
  subjectId: z.uuid().optional(),
  sortBy: z.enum(['createdAt', 'name', 'code', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type ListMyCourseSectionsQuery = z.infer<
  typeof listMyCourseSectionsQuerySchema
>;
