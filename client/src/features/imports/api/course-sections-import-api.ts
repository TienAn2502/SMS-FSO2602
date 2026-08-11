import { api } from '@/lib/api';
import type { ApiSuccessResponse } from '@/types/api.types';

export interface CourseSectionImportRowError {
  sheet: string;
  row: number;
  field: string;
  message: string;
}

export interface CourseSectionImportResult {
  successCount: number;
  errorCount: number;
  created: number;
  skippedExisting: number;
  assignmentsCreated: number;
  errors: CourseSectionImportRowError[];
}

export interface ImportCourseSectionsInput {
  file: File;
  semesterId: string;
}

export async function downloadCourseSectionsImportTemplate(params?: {
  semesterId?: string;
}): Promise<void> {
  const response = await api.get('/imports/templates/course-sections', {
    responseType: 'blob',
    params: {
      semesterId: params?.semesterId || undefined,
    },
  });

  const url = URL.createObjectURL(response.data);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'mau-import-lop-mon.xlsx';
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function importCourseSections(
  input: ImportCourseSectionsInput,
): Promise<CourseSectionImportResult> {
  const formData = new FormData();
  formData.append('file', input.file);
  formData.append('semesterId', input.semesterId);

  const { data } = await api.post<
    ApiSuccessResponse<CourseSectionImportResult>
  >('/imports/course-sections', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return data.data;
}
