import { api } from '@/lib/api';
import type { ApiSuccessResponse } from '@/types/api.types';

export interface PrepareNextYearPreview {
  sourceAcademicYearId: string;
  sourceAcademicYearName: string;
  targetAcademicYearId: string;
  targetAcademicYearName: string;
  classesToCreate: number;
  classesAlreadyExist: number;
  classPlans: Array<{
    code: string;
    gradeLevelCode: string;
    reason: 'PROMOTED';
    sourceClassCode: string;
    exists: boolean;
    homeroomTeacherId: string | null;
  }>;
  studentsToMap: number;
  promotedCount: number;
  retainedSkippedCount: number;
  graduatedSkippedCount: number;
  unmappedCount: number;
  enrollmentPreview: {
    eligibleCount: number;
    wouldCreateCount: number;
    skippedExistingCount: number;
    missingNextClassCount: number;
  } | null;
}

export interface PrepareNextYearInput {
  sourceAcademicYearId: string;
  targetAcademicYearId: string;
  targetSemesterId?: string;
  createEnrollments?: boolean;
  enrolledAt?: string;
  note?: string;
}

export interface PrepareNextYearResult {
  sourceAcademicYearId: string;
  targetAcademicYearId: string;
  classesCreated: number;
  classesSkippedExisting: number;
  studentsMapped: number;
  promotedMapped: number;
  retainedSkipped: number;
  graduatedSkipped: number;
  unmapped: number;
  enrollments: {
    createdCount: number;
    skippedExistingCount: number;
    missingNextClassCount: number;
    eligibleCount: number;
  } | null;
}

export async function previewPrepareNextYear(params: {
  sourceAcademicYearId: string;
  targetAcademicYearId: string;
  targetSemesterId?: string;
}): Promise<PrepareNextYearPreview> {
  const { data } = await api.get<ApiSuccessResponse<PrepareNextYearPreview>>(
    '/year-preparation/preview',
    { params },
  );
  return data.data;
}

export async function prepareNextYear(
  input: PrepareNextYearInput,
): Promise<PrepareNextYearResult> {
  const { data } = await api.post<ApiSuccessResponse<PrepareNextYearResult>>(
    '/year-preparation/prepare-next-year',
    input,
  );
  return data.data;
}
