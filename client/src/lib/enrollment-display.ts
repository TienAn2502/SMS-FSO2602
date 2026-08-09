import type { EnrollmentStatus } from '@/features/student-enrollments/api/student-enrollments-api';
import { ENROLLMENT_STATUS_LABELS } from '@/lib/labels';

type EnrollmentLike = {
  status: EnrollmentStatus;
  semesterIsCurrent?: boolean;
};

/** Trạng thái hiển thị — ACTIVE ở học kỳ không còn hiện hành coi như đã xong HK. */
export function getEnrollmentDisplayStatus(
  enrollment: EnrollmentLike,
): EnrollmentStatus {
  if (
    enrollment.status === 'ACTIVE' &&
    enrollment.semesterIsCurrent === false
  ) {
    return 'SEMESTER_COMPLETED';
  }

  return enrollment.status;
}

export function getEnrollmentStatusLabel(enrollment: EnrollmentLike): string {
  return ENROLLMENT_STATUS_LABELS[getEnrollmentDisplayStatus(enrollment)];
}

export const ENROLLMENT_STATUS_BADGE: Record<EnrollmentStatus, string> = {
  ACTIVE: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  TRANSFERRED: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  WITHDRAWN: 'bg-muted text-muted-foreground',
  SEMESTER_COMPLETED: 'bg-sky-500/10 text-sky-700 dark:text-sky-400',
  COMPLETED: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
};

export function getEnrollmentStatusBadgeClass(
  enrollment: EnrollmentLike,
): string {
  return ENROLLMENT_STATUS_BADGE[getEnrollmentDisplayStatus(enrollment)];
}
