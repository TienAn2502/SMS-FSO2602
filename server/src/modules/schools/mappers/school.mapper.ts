import type { School } from '@prisma/client';

export interface SchoolResponse {
  id: string;
  code: string;
  name: string;
  shortName: string | null;
  schoolType: School['schoolType'];
  email: string | null;
  phone: string | null;
  address: string | null;
  logoFileId: string | null;
  status: School['status'];
}

export function toSchoolResponse(school: School): SchoolResponse {
  return {
    id: school.id,
    code: school.code,
    name: school.name,
    shortName: school.shortName,
    schoolType: school.schoolType,
    email: school.email,
    phone: school.phone,
    address: school.address,
    logoFileId: school.logoFileId,
    status: school.status,
  };
}
