import type { TimetableEntry } from '@/features/timetable/api/timetable-entries-api';
import { DAY_OF_WEEK_LABELS } from '@/lib/labels';

const DEFAULT_DAYS = [1, 2, 3, 4, 5] as const;
/** Tiết 1–5 sáng, 6–10 chiều. */
const DEFAULT_PERIODS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export type TimetableGridMode = 'teacher' | 'student';

interface ClassTimetableGridProps {
  entries: TimetableEntry[];
  /** teacher: ẩn tên GV; student: hiện GV + môn */
  mode?: TimetableGridMode;
  emptyMessage?: string;
}

function formatPeriodLabel(period: number): string {
  if (period >= 1 && period <= 5) {
    return `${period} (Sáng)`;
  }
  if (period >= 6 && period <= 10) {
    return `${period} (Chiều)`;
  }
  return String(period);
}

function buildGrid(entries: TimetableEntry[]) {
  const periodSet = new Set<number>(DEFAULT_PERIODS);
  for (const entry of entries) {
    periodSet.add(entry.periodNumber);
  }
  const periods = [...periodSet].sort((a, b) => a - b);

  const cellMap = new Map<string, TimetableEntry[]>();
  for (const entry of entries) {
    const key = `${entry.dayOfWeek}-${entry.periodNumber}`;
    const list = cellMap.get(key) ?? [];
    list.push(entry);
    cellMap.set(key, list);
  }

  return { periods, cellMap };
}

function TimetableCellContent({
  entry,
  mode,
}: {
  entry: TimetableEntry;
  mode: TimetableGridMode;
}) {
  if (mode === 'teacher') {
    return (
      <div className='space-y-0.5'>
        <div className='font-medium'>{entry.courseSectionCode}</div>
        <div className='text-muted-foreground'>{entry.courseSectionName}</div>
        {entry.room ? (
          <div className='text-muted-foreground'>{entry.room}</div>
        ) : null}
      </div>
    );
  }

  return (
    <div className='space-y-0.5'>
      <div className='font-medium'>{entry.courseSectionName}</div>
      <div className='text-muted-foreground'>{entry.teacherFullName}</div>
      {entry.room ? (
        <div className='text-muted-foreground'>{entry.room}</div>
      ) : null}
    </div>
  );
}

export function ClassTimetableGrid({
  entries,
  mode = 'student',
  emptyMessage = 'Chưa có tiết học.',
}: ClassTimetableGridProps) {
  if (entries.length === 0) {
    return <p className='text-sm text-muted-foreground'>{emptyMessage}</p>;
  }

  const { periods, cellMap } = buildGrid(entries);

  return (
    <div className='overflow-x-auto rounded-md border'>
      <table className='w-full min-w-[640px] border-collapse text-sm'>
        <thead>
          <tr>
            <th className='sticky left-0 z-10 border bg-muted/80 px-3 py-2 text-left font-medium backdrop-blur'>
              Tiết
            </th>
            {DEFAULT_DAYS.map((day) => (
              <th
                key={day}
                className='border bg-muted/50 px-3 py-2 text-left font-medium'
              >
                {DAY_OF_WEEK_LABELS[day] ?? `Thứ ${day + 1}`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {periods.map((period) => (
            <tr key={period}>
              <td className='sticky left-0 z-10 border bg-background px-3 py-2 font-medium whitespace-nowrap'>
                {formatPeriodLabel(period)}
              </td>
              {DEFAULT_DAYS.map((day) => {
                const cellEntries = cellMap.get(`${day}-${period}`) ?? [];
                return (
                  <td key={day} className='border px-3 py-2 align-top'>
                    {cellEntries.length === 0 ? null : (
                      <div className='space-y-2'>
                        {cellEntries.map((entry) => (
                          <TimetableCellContent
                            key={entry.id}
                            entry={entry}
                            mode={mode}
                          />
                        ))}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
