import { api } from '@/lib/api';
import type { ApiSuccessResponse } from '@/types/api.types';

export interface ImportRowError {
  row: number;
  field: string;
  message: string;
}

export interface ImportResult {
  successCount: number;
  errorCount: number;
  created: number;
  updated: number;
  errors: ImportRowError[];
}

export type StudentImportRowError = ImportRowError;
export type StudentImportResult = ImportResult;

export interface ImportStudentsInput {
  file: File;
  academicYearId: string;
  semesterId: string;
}

export async function downloadStudentsImportTemplate(
  academicYearId?: string,
): Promise<void> {
  const response = await api.get('/imports/templates/students', {
    params: academicYearId ? { academicYearId } : undefined,
    responseType: 'blob',
  });

  const url = URL.createObjectURL(response.data);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'mau-import-hoc-sinh.xlsx';
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function importStudents(
  input: ImportStudentsInput,
): Promise<StudentImportResult> {
  const formData = new FormData();
  formData.append('file', input.file);
  formData.append('academicYearId', input.academicYearId);
  formData.append('semesterId', input.semesterId);

  const { data } = await api.post<ApiSuccessResponse<StudentImportResult>>(
    '/imports/students',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );

  return data.data;
}

export async function downloadTeachersImportTemplate(): Promise<void> {
  const response = await api.get('/imports/templates/teachers', {
    responseType: 'blob',
  });

  const url = URL.createObjectURL(response.data);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'mau-import-giao-vien.xlsx';
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function importTeachers(file: File): Promise<ImportResult> {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await api.post<ApiSuccessResponse<ImportResult>>(
    '/imports/teachers',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );

  return data.data;
}

export async function downloadParentsImportTemplate(): Promise<void> {
  const response = await api.get('/imports/templates/parents', {
    responseType: 'blob',
  });

  const url = URL.createObjectURL(response.data);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'mau-import-phu-huynh.xlsx';
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function importParents(file: File): Promise<ImportResult> {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await api.post<ApiSuccessResponse<ImportResult>>(
    '/imports/parents',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );

  return data.data;
}

export interface ImportHomeroomClassesInput {
  file: File;
  academicYearId: string;
}

export async function downloadHomeroomClassesImportTemplate(
  academicYearId?: string,
): Promise<void> {
  const response = await api.get('/imports/templates/homeroom-classes', {
    params: academicYearId ? { academicYearId } : undefined,
    responseType: 'blob',
  });

  const url = URL.createObjectURL(response.data);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'mau-import-lop-hanh-chinh.xlsx';
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function importHomeroomClasses(
  input: ImportHomeroomClassesInput,
): Promise<ImportResult> {
  const formData = new FormData();
  formData.append('file', input.file);
  formData.append('academicYearId', input.academicYearId);

  const { data } = await api.post<ApiSuccessResponse<ImportResult>>(
    '/imports/homeroom-classes',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );

  return data.data;
}

export interface ImportTeachingAssignmentsInput {
  file: File;
  semesterId: string;
}

export async function downloadTeachingAssignmentsImportTemplate(
  semesterId?: string,
): Promise<void> {
  const response = await api.get('/imports/templates/teaching-assignments', {
    params: semesterId ? { semesterId } : undefined,
    responseType: 'blob',
  });

  const url = URL.createObjectURL(response.data);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'mau-import-phan-cong-giang-day.xlsx';
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function importTeachingAssignments(
  input: ImportTeachingAssignmentsInput,
): Promise<ImportResult> {
  const formData = new FormData();
  formData.append('file', input.file);
  formData.append('semesterId', input.semesterId);

  const { data } = await api.post<ApiSuccessResponse<ImportResult>>(
    '/imports/teaching-assignments',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );

  return data.data;
}

export type TimetableImportMode = 'replace' | 'merge';

export interface ImportTimetableInput {
  file: File;
  semesterId: string;
  mode?: TimetableImportMode;
}

export interface TimetableImportResult extends ImportResult {
  sheetsProcessed: number;
}

export async function importTimetable(
  input: ImportTimetableInput,
): Promise<TimetableImportResult> {
  const formData = new FormData();
  formData.append('file', input.file);
  formData.append('semesterId', input.semesterId);
  formData.append('mode', input.mode ?? 'replace');

  const { data } = await api.post<ApiSuccessResponse<TimetableImportResult>>(
    '/imports/timetable',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );

  return data.data;
}
