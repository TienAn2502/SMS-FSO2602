import type { HomeroomClass } from '@prisma/client';

export interface HomeroomClassResponse {
  id: string;
  academicYearId: string;
  gradeLevelId: string;
  name: string;
  code: string;
  capacity: number | null;
  homeroomTeacherId: string | null;
  status: HomeroomClass['status'];
  createdAt: string;
  updatedAt: string;
}

export function toHomeroomClassResponse(
  homeroomClass: HomeroomClass,
): HomeroomClassResponse {
  return {
    id: homeroomClass.id,
    academicYearId: homeroomClass.academicYearId,
    gradeLevelId: homeroomClass.gradeLevelId,
    name: homeroomClass.name,
    code: homeroomClass.code,
    capacity: homeroomClass.capacity,
    homeroomTeacherId: homeroomClass.homeroomTeacherId,
    status: homeroomClass.status,
    createdAt: homeroomClass.createdAt.toISOString(),
    updatedAt: homeroomClass.updatedAt.toISOString(),
  };
}
