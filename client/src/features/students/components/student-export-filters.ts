import type { AcademicEntityStatus } from '@/types/api.types';

export interface StudentExportFilters {
  search?: string;
  academicYearId?: string;
  semesterId?: string;
  homeroomClassId?: string;
  status?: AcademicEntityStatus;
}
