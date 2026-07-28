import { api } from '@/lib/api';
import type {
  AcademicEntityStatus,
  ApiPaginatedResponse,
  ApiSuccessResponse,
} from '@/types/api.types';

export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export interface StudentEnrollmentSummary {
  id: string;
  semesterId: string;
  semesterName: string;
  academicYearId: string;
  academicYearName: string;
  homeroomClassId: string;
  homeroomClassName: string;
  homeroomClassCode: string;
  enrolledAt: string;
  status: 'ACTIVE' | 'TRANSFERRED' | 'WITHDRAWN' | 'COMPLETED';
}

export interface Student {
  id: string;
  userId: string | null;
  userEmail: string | null;
  fullName: string;
  dateOfBirth: string | null;
  gender: Gender | null;
  phone: string | null;
  address: string | null;
  avatarFileId: string | null;
  status: AcademicEntityStatus;
  currentEnrollment: StudentEnrollmentSummary | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListStudentsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: AcademicEntityStatus;
  homeroomClassId?: string;
  semesterId?: string;
  academicYearId?: string;
}

export interface CreateStudentInput {
  fullName: string;
  dateOfBirth?: string;
  gender?: Gender;
  phone?: string;
  address?: string;
  account?: {
    email: string;
    password: string;
  };
}

export interface UpdateStudentInput {
  fullName?: string;
  dateOfBirth?: string | null;
  gender?: Gender | null;
  phone?: string | null;
  address?: string | null;
}

export async function fetchStudents(params: ListStudentsParams = {}) {
  const { data } = await api.get<ApiPaginatedResponse<Student>>('/students', {
    params,
  });
  return { items: data.data, meta: data.meta };
}

export async function fetchStudent(id: string): Promise<Student> {
  const { data } = await api.get<ApiSuccessResponse<Student>>(`/students/${id}`);
  return data.data;
}

export async function createStudent(
  input: CreateStudentInput,
): Promise<Student> {
  const { data } = await api.post<ApiSuccessResponse<Student>>(
    '/students',
    input,
  );
  return data.data;
}

export async function updateStudent(
  id: string,
  input: UpdateStudentInput,
): Promise<Student> {
  const { data } = await api.patch<ApiSuccessResponse<Student>>(
    `/students/${id}`,
    input,
  );
  return data.data;
}

export async function updateStudentStatus(
  id: string,
  status: AcademicEntityStatus,
): Promise<Student> {
  const { data } = await api.patch<ApiSuccessResponse<Student>>(
    `/students/${id}/status`,
    { status },
  );
  return data.data;
}
