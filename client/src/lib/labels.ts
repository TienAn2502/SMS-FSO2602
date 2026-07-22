import type { UserRole } from '@/types/api.types';

export const ROLE_LABELS: Record<UserRole, string> = {
  SCHOOL_ADMIN: 'Quản trị trường',
  TEACHER: 'Giáo viên',
  STUDENT: 'Học sinh',
};

export const STATUS_LABELS = {
  ACTIVE: 'Hoạt động',
  INACTIVE: 'Ngưng hoạt động',
  LOCKED: 'Đã khóa',
} as const;
