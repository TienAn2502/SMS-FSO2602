import type { UserRole } from '@/types/api.types';

export const ROLE_LABELS: Record<UserRole, string> = {
  SCHOOL_ADMIN: 'Quản trị trường',
  TEACHER: 'Giáo viên',
  STUDENT: 'Học sinh',
  PARENT: 'Phụ huynh',
};

export const STATUS_LABELS = {
  ACTIVE: 'Hoạt động',
  INACTIVE: 'Ngưng hoạt động',
  LOCKED: 'Đã khóa',
} as const;

export const ACADEMIC_STATUS_LABELS = {
  ACTIVE: 'Hoạt động',
  INACTIVE: 'Ngưng hoạt động',
} as const;

export const GENDER_LABELS = {
  MALE: 'Nam',
  FEMALE: 'Nữ',
  OTHER: 'Khác',
} as const;

export const ENROLLMENT_STATUS_LABELS = {
  ACTIVE: 'Đang học',
  TRANSFERRED: 'Đã chuyển lớp',
  WITHDRAWN: 'Đã rút',
  COMPLETED: 'Hoàn thành',
} as const;

export const PARENT_RELATIONSHIP_LABELS = {
  FATHER: 'Bố',
  MOTHER: 'Mẹ',
  GUARDIAN: 'Người giám hộ',
  OTHER: 'Khác',
} as const;

export const DAY_OF_WEEK_LABELS: Record<number, string> = {
  1: 'Thứ 2',
  2: 'Thứ 3',
  3: 'Thứ 4',
  4: 'Thứ 5',
  5: 'Thứ 6',
  6: 'Thứ 7',
  7: 'Chủ nhật',
};

export const ATTENDANCE_SESSION_STATUS_LABELS = {
  OPEN: 'Đang điểm danh',
  CLOSED: 'Đã đóng',
} as const;

export const ATTENDANCE_RECORD_STATUS_LABELS = {
  PRESENT: 'Có mặt',
  ABSENT: 'Vắng',
  LATE: 'Muộn',
  EXCUSED: 'Có phép',
} as const;
