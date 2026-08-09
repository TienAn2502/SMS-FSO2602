import type { AcademicYear } from '@prisma/client';

import { toIsoDateString } from '@/common/schemas/academic.schema';

export interface AcademicYearResponse {
  id: string;
  name: string;
  code: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  status: AcademicYear['status'];
  createdAt: string;
  updatedAt: string;
}

export function toAcademicYearResponse(
  academicYear: AcademicYear,
): AcademicYearResponse {
  return {
    id: academicYear.id,
    name: academicYear.name,
    code: academicYear.code,
    startDate: toIsoDateString(academicYear.startDate),
    endDate: toIsoDateString(academicYear.endDate),
    isCurrent: academicYear.isCurrent,
    status: academicYear.status,
    createdAt: academicYear.createdAt.toISOString(),
    updatedAt: academicYear.updatedAt.toISOString(),
  };
}
