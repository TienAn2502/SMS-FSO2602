export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message: string | null;
}

export interface ApiErrorDetail {
  field: string;
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  code: string;
  message: string;
  details: ApiErrorDetail[];
  data?: unknown;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiPaginatedResponse<T> {
  success: true;
  data: T[];
  meta: PaginationMeta;
  message: string | null;
}

export type UserRole =
  | 'SYSTEM_ADMIN'
  | 'SCHOOL_ADMIN'
  | 'TEACHER'
  | 'STUDENT'
  | 'PARENT';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'LOCKED';
export type AcademicEntityStatus = 'ACTIVE' | 'INACTIVE';
