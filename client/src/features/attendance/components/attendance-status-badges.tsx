import type { AttendanceRecordStatus } from '@/features/attendance/api/attendance-api';
import {
  ATTENDANCE_RECORD_STATUS_LABELS,
  ATTENDANCE_SESSION_STATUS_LABELS,
} from '@/lib/labels';
import { cn } from '@/lib/utils';

const RECORD_STATUS_STYLES: Record<AttendanceRecordStatus, string> = {
  PRESENT: 'bg-emerald-500/10 text-emerald-700',
  ABSENT: 'bg-red-500/10 text-red-700',
  LATE: 'bg-amber-500/10 text-amber-700',
  EXCUSED: 'bg-blue-500/10 text-blue-700',
};

export function AttendanceRecordStatusBadge({
  status,
}: {
  status: AttendanceRecordStatus;
}) {
  return (
    <span
      className={cn(
        'inline-flex rounded-md px-2 py-0.5 text-xs font-medium',
        RECORD_STATUS_STYLES[status],
      )}
    >
      {ATTENDANCE_RECORD_STATUS_LABELS[status]}
    </span>
  );
}

export function AttendanceSessionStatusBadge({
  status,
}: {
  status: 'OPEN' | 'CLOSED';
}) {
  return (
    <span
      className={cn(
        'inline-flex rounded-md px-2 py-0.5 text-xs font-medium',
        status === 'OPEN'
          ? 'bg-sky-500/10 text-sky-700'
          : 'bg-muted text-muted-foreground',
      )}
    >
      {ATTENDANCE_SESSION_STATUS_LABELS[status]}
    </span>
  );
}
