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
  errors: TimetableImportCellError[];
}

export const timetableImportModeSchema = z.enum(['replace', 'merge']);

export type TimetableImportMode = z.infer<typeof timetableImportModeSchema>;

export const importTimetableFormSchema = z.object({
  semesterId: z.uuid('Học kỳ không hợp lệ'),
  mode: timetableImportModeSchema.default('replace'),
});

export type ImportTimetableFormInput = z.infer<typeof importTimetableFormSchema>;

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
