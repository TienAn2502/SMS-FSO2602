import { api } from '@/lib/api';
import type {
  AcademicEntityStatus,
  ApiPaginatedResponse,
  ApiSuccessResponse,
} from '@/types/api.types';

export interface TimetableEntry {
  id: string;
  semesterId: string;
  academicYearId: string;
  courseSectionId: string;
  courseSectionCode: string;
  courseSectionName: string;
  homeroomClassId: string | null;
  teacherId: string;
  teacherFullName: string;
  dayOfWeek: number;
  periodNumber: number;
  room: string | null;
  status: AcademicEntityStatus;
}

export interface ListTimetableEntriesParams {
  page?: number;
  limit?: number;
  semesterId?: string;
  academicYearId?: string;
  courseSectionId?: string;
  teacherId?: string;
  homeroomClassId?: string;
  subjectId?: string;
  search?: string;
  dayOfWeek?: number;
  status?: AcademicEntityStatus;
  includeAllSemesters?: boolean;
}

export type TimetableMatrixParams = Omit<
  ListTimetableEntriesParams,
  'page' | 'limit'
>;

export interface CreateTimetableEntryInput {
  courseSectionId: string;
  teacherId: string;
  dayOfWeek: number;
  periodNumber: number;
  room?: string;
}

export interface UpdateTimetableEntryInput {
  teacherId?: string;
  dayOfWeek?: number;
  periodNumber?: number;
  room?: string | null;
}

export async function fetchTimetableEntries(
  params: ListTimetableEntriesParams = {},
) {
  const { data } = await api.get<ApiPaginatedResponse<TimetableEntry>>(
    '/timetable-entries',
    { params },
  );
  return { items: data.data, meta: data.meta };
}

export async function fetchTimetableMatrix(params: TimetableMatrixParams = {}) {
  const { data } = await api.get<ApiSuccessResponse<TimetableEntry[]>>(
    '/timetable-entries/matrix',
    { params },
  );
  return data.data;
}

export async function createTimetableEntry(
  input: CreateTimetableEntryInput,
): Promise<TimetableEntry> {
  const { data } = await api.post<ApiSuccessResponse<TimetableEntry>>(
    '/timetable-entries',
    input,
  );
  return data.data;
}

export async function updateTimetableEntry(
  id: string,
  input: UpdateTimetableEntryInput,
): Promise<TimetableEntry> {
  const { data } = await api.patch<ApiSuccessResponse<TimetableEntry>>(
    `/timetable-entries/${id}`,
    input,
  );
  return data.data;
}

export async function deleteTimetableEntry(id: string): Promise<TimetableEntry> {
  const { data } = await api.delete<ApiSuccessResponse<TimetableEntry>>(
    `/timetable-entries/${id}`,
  );
  return data.data;
}
