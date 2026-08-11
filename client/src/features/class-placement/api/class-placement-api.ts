import { api } from '@/lib/api';
import type {
  ApiPaginatedResponse,
  ApiSuccessResponse,
} from '@/types/api.types';

export type PlacementReason = 'RETAINED' | 'NEW_INTAKE';

export interface UnassignedPlacementItem {
  studentId: string;
  fullName: string;
  externalCode: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  reason: PlacementReason;
  previousHomeroomClassCode: string | null;
  previousGradeLevelId: string | null;
  previousGradeLevelCode: string | null;
  previousAcademicYearName: string | null;
}

export interface ListUnassignedParams {
  semesterId: string;
  reason?: PlacementReason;
  search?: string;
  gradeLevelId?: string;
  page?: number;
  limit?: number;
}

export interface AssignClassPlacementInput {
  semesterId: string;
  assignments: Array<{ studentId: string; homeroomClassId: string }>;
  enrolledAt?: string;
  note?: string;
}

export interface AutoBalanceClassPlacementInput {
  semesterId: string;
  gradeLevelId: string;
  reason?: PlacementReason;
  studentIds?: string[];
  enrolledAt?: string;
  note?: string;
}

export interface AutoBalancePreview {
  semesterId: string;
  academicYearId: string;
  gradeLevelId: string;
  gradeLevelCode: string;
  studentCount: number;
  classCount: number;
  wouldAssignCount: number;
  unplacedCount: number;
  classLoads: Array<{
    homeroomClassId: string;
    code: string;
    currentCount: number;
    capacity: number | null;
    wouldReceive: number;
  }>;
}

export async function fetchUnassignedPlacements(params: ListUnassignedParams) {
  const { data } = await api.get<ApiPaginatedResponse<UnassignedPlacementItem>>(
    '/class-placement/unassigned',
    { params },
  );
  return { items: data.data, meta: data.meta };
}

export async function previewAutoBalanceClassPlacement(params: {
  semesterId: string;
  gradeLevelId: string;
  reason?: PlacementReason;
}): Promise<AutoBalancePreview> {
  const { data } = await api.get<ApiSuccessResponse<AutoBalancePreview>>(
    '/class-placement/auto-balance/preview',
    { params },
  );
  return data.data;
}

export async function assignClassPlacement(input: AssignClassPlacementInput) {
  const { data } = await api.post<
    ApiSuccessResponse<{
      semesterId: string;
      createdCount: number;
      requestedCount: number;
    }>
  >('/class-placement/assign', input);
  return data.data;
}

export async function autoBalanceClassPlacement(
  input: AutoBalanceClassPlacementInput,
) {
  const { data } = await api.post<
    ApiSuccessResponse<{
      semesterId: string;
      gradeLevelId: string;
      gradeLevelCode: string;
      createdCount: number;
      unplacedCount: number;
      unplacedStudentIds: string[];
      classLoads: Array<{
        homeroomClassId: string;
        code: string;
        assignedCount: number;
      }>;
    }>
  >('/class-placement/auto-balance', input);
  return data.data;
}
