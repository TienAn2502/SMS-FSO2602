import type { Semester } from '@prisma/client';

import { toIsoDateString } from '../../../common/schemas/academic.schema';

export interface SemesterResponse {
  id: string;
  academicYearId: string;
  name: string;
  code: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  status: Semester['status'];
  createdAt: string;
  updatedAt: string;
}

export function toSemesterResponse(semester: Semester): SemesterResponse {
  return {
    id: semester.id,
    academicYearId: semester.academicYearId,
    name: semester.name,
    code: semester.code,
    startDate: toIsoDateString(semester.startDate),
    endDate: toIsoDateString(semester.endDate),
    isCurrent: semester.isCurrent,
    status: semester.status,
    createdAt: semester.createdAt.toISOString(),
    updatedAt: semester.updatedAt.toISOString(),
  };
}
