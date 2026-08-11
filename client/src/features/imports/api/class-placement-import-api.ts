import { api } from '@/lib/api';
import type { ApiSuccessResponse } from '@/types/api.types';

export interface ClassPlacementImportRowError {
  sheet: string;
  row: number;
  field: string;
  message: string;
}

export interface ClassPlacementImportResult {
  successCount: number;
  errorCount: number;
  created: number;
  updated: number;
  classesCreated: number;
  classesExisting: number;
  errors: ClassPlacementImportRowError[];
}

export interface ImportClassPlacementInput {
  file: File;
  academicYearId: string;
  semesterId: string;
}

export async function downloadClassPlacementImportTemplate(params?: {
  academicYearId?: string;
  semesterId?: string;
}): Promise<void> {
  const response = await api.get('/imports/templates/class-placement', {
    responseType: 'blob',
    params: {
      academicYearId: params?.academicYearId || undefined,
      semesterId: params?.semesterId || undefined,
    },
  });

  const url = URL.createObjectURL(response.data);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'mau-import-chia-lop.xlsx';
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function importClassPlacement(
  input: ImportClassPlacementInput,
): Promise<ClassPlacementImportResult> {
  const formData = new FormData();
  formData.append('file', input.file);
  formData.append('academicYearId', input.academicYearId);
  formData.append('semesterId', input.semesterId);

  const { data } = await api.post<
    ApiSuccessResponse<ClassPlacementImportResult>
  >('/imports/class-placement', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return data.data;
}
