import { EnrollmentStatus } from '@prisma/client';

/** Ghi danh còn trong năm học (đang học hoặc đã hoàn thành HK). */
export const STUDENT_YEAR_ENROLLMENT_STATUSES: EnrollmentStatus[] = [
  EnrollmentStatus.ACTIVE,
  EnrollmentStatus.SEMESTER_COMPLETED,
];

/** Ghi danh còn hiển thị trên sổ điểm của một học kỳ (đang học hoặc đã kết thúc HK). */
export const GRADEBOOK_ENROLLMENT_STATUSES = STUDENT_YEAR_ENROLLMENT_STATUSES;
