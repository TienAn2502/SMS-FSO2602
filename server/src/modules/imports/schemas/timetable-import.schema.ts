import { z } from 'zod';

export interface TimetableImportCellError {
  sheet: string;
  periodNumber?: number;
  dayOfWeek?: number;
  field: string;
  message: string;
}

export interface TimetableImportResult {
  successCount: number;
  errorCount: number;
  created: number;
  updated: number;
  sheetsProcessed: number;
  /** Ô có môn nhưng chưa có phân công ACTIVE → bỏ qua, không coi là lỗi. */
  skippedNoAssignment: number;
  errors: TimetableImportCellError[];
}

export const importTimetableFormSchema = z.object({
  semesterId: z.uuid('Học kỳ không hợp lệ'),
});

export type ImportTimetableFormInput = z.infer<typeof importTimetableFormSchema>;

export const timetableImportTemplateQuerySchema = z.object({
  semesterId: z.uuid().optional(),
});

export type TimetableImportTemplateQuery = z.infer<
  typeof timetableImportTemplateQuerySchema
>;

export interface ResolvedTimetableImportEntry {
  sheetName: string;
  homeroomClassId: string;
  homeroomClassCode: string;
  courseSectionId: string;
  courseSectionCode: string;
  teacherId: string;
  dayOfWeek: number;
  periodNumber: number;
  room: string | null;
}
