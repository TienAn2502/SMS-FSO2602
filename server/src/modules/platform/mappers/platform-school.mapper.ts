import type { School, User } from '@prisma/client';

import { toSchoolResponse, type SchoolResponse } from '@/modules/schools/mappers/school.mapper';

export interface PlatformAdminSummary {
  userId: string;
  email: string;
  fullName: string;
}

export interface PlatformSchoolListItem extends SchoolResponse {
  createdAt: string;
  adminSummary: PlatformAdminSummary | null;
}

export interface PlatformSchoolDetail extends SchoolResponse {
  createdAt: string;
  updatedAt: string;
  adminSummary: PlatformAdminSummary | null;
  stats: {
    studentCount: number;
    teacherCount: number;
  };
}

export interface PlatformSchoolCreateResult {
  school: SchoolResponse;
  admin: {
    id: string;
    email: string;
    fullName: string;
    role: User['role'];
  };
  seededGradeLevelCount: number;
}

export function toAdminSummary(user: User): PlatformAdminSummary {
  return {
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
  };
}

export function toPlatformSchoolListItem(
  school: School,
  admin: User | null,
): PlatformSchoolListItem {
  return {
    ...toSchoolResponse(school),
    createdAt: school.createdAt.toISOString(),
    adminSummary: admin ? toAdminSummary(admin) : null,
  };
}

export function toPlatformSchoolDetail(
  school: School,
  admin: User | null,
  stats: { studentCount: number; teacherCount: number },
): PlatformSchoolDetail {
  return {
    ...toSchoolResponse(school),
    createdAt: school.createdAt.toISOString(),
    updatedAt: school.updatedAt.toISOString(),
    adminSummary: admin ? toAdminSummary(admin) : null,
    stats,
  };
}

export function toPlatformSchoolCreateResult(
  school: School,
  admin: User,
  seededGradeLevelCount = 0,
): PlatformSchoolCreateResult {
  return {
    school: toSchoolResponse(school),
    admin: {
      id: admin.id,
      email: admin.email,
      fullName: admin.fullName,
      role: admin.role,
    },
    seededGradeLevelCount,
  };
}
