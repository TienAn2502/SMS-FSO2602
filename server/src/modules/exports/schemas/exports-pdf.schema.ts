import { z } from 'zod';

import { exportSemesterSummariesQuerySchema } from '@/modules/exports/schemas/semester-summaries-export.schema';
import { exportTimetableQuerySchema } from '@/modules/exports/schemas/timetable-export.schema';
import { exportYearSummariesQuerySchema } from '@/modules/exports/schemas/year-summaries-export.schema';

export const exportTimetablePdfQuerySchema = exportTimetableQuerySchema.omit({
  format: true,
});

export type ExportTimetablePdfQuery = z.infer<
  typeof exportTimetablePdfQuerySchema
>;

export const exportSemesterSummariesPdfQuerySchema =
  exportSemesterSummariesQuerySchema.omit({ format: true });

export type ExportSemesterSummariesPdfQuery = z.infer<
  typeof exportSemesterSummariesPdfQuerySchema
>;

export const exportYearSummariesPdfQuerySchema =
  exportYearSummariesQuerySchema.omit({ format: true });

export type ExportYearSummariesPdfQuery = z.infer<
  typeof exportYearSummariesPdfQuerySchema
>;
