import type {
  AttendanceRecordStatus,
  AttendanceRecordSummary,
} from '@/features/attendance/api/attendance-api';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ATTENDANCE_RECORD_STATUS_LABELS } from '@/lib/labels';
import { selectClassName } from '@/lib/form-styles';

import { AttendanceRecordStatusBadge } from './attendance-status-badges';

export type RecordDraft = Record<
  string,
  { status: AttendanceRecordStatus; note: string }
>;

export function buildRecordDraft(
  records: AttendanceRecordSummary[],
): RecordDraft {
  return Object.fromEntries(
    records.map((record) => [
      record.studentId,
      { status: record.status, note: record.note ?? '' },
    ]),
  );
}

export function recordsToBulkPayload(draft: RecordDraft) {
  return Object.entries(draft).map(([studentId, value]) => ({
    studentId,
    status: value.status,
    note: value.note.trim() ? value.note.trim() : null,
  }));
}

interface AttendanceRecordGridProps {
  records: AttendanceRecordSummary[];
  draft: RecordDraft;
  readonly?: boolean;
  emptyHint?: string;
  onDraftChange: (
    studentId: string,
    patch: Partial<{ status: AttendanceRecordStatus; note: string }>,
  ) => void;
}

export function AttendanceRecordGrid({
  records,
  draft,
  readonly = false,
  emptyHint = 'Chưa có học sinh trong phiên điểm danh.',
  onDraftChange,
}: AttendanceRecordGridProps) {
  if (records.length === 0) {
    return <p className='text-sm text-muted-foreground'>{emptyHint}</p>;
  }

  return (
    <div className='rounded-md border'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Học sinh</TableHead>
            <TableHead className='w-40'>Trạng thái</TableHead>
            <TableHead>Ghi chú</TableHead>
            {!readonly ? (
              <TableHead className='w-48'>Xem nhanh</TableHead>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record) => {
            const row = draft[record.studentId] ?? {
              status: record.status,
              note: record.note ?? '',
            };

            return (
              <TableRow key={record.studentId}>
                <TableCell className='font-medium'>
                  {record.studentFullName}
                </TableCell>
                <TableCell>
                  {readonly ? (
                    <AttendanceRecordStatusBadge status={row.status} />
                  ) : (
                    <select
                      className={selectClassName}
                      value={row.status}
                      onChange={(event) =>
                        onDraftChange(record.studentId, {
                          status: event.target.value as AttendanceRecordStatus,
                        })
                      }
                    >
                      {Object.entries(ATTENDANCE_RECORD_STATUS_LABELS).map(
                        ([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ),
                      )}
                    </select>
                  )}
                </TableCell>
                <TableCell>
                  {readonly ? (
                    <span className='text-sm text-muted-foreground'>
                      {row.note || '—'}
                    </span>
                  ) : (
                    <Input
                      value={row.note}
                      placeholder='Ghi chú (tuỳ chọn)'
                      onChange={(event) =>
                        onDraftChange(record.studentId, {
                          note: event.target.value,
                        })
                      }
                    />
                  )}
                </TableCell>
                {!readonly ? (
                  <TableCell>
                    <AttendanceRecordStatusBadge status={row.status} />
                  </TableCell>
                ) : null}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
