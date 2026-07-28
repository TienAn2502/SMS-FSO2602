import type { TimetableEntry } from '@/features/timetable/api/timetable-entries-api';
import { DAY_OF_WEEK_LABELS } from '@/lib/labels';

const DEFAULT_DAYS = [1, 2, 3, 4, 5] as const;

interface ClassTimetableGridProps {
  entries: TimetableEntry[];
  emptyMessage?: string;
}

function buildGrid(entries: TimetableEntry[]) {
  const periodSet = new Set(entries.map((entry) => entry.periodNumber));
  const periods = periodSet.size > 0
    ? [...periodSet].sort((a, b) => a - b)
    : [1, 2, 3, 4, 5];

  const cellMap = new Map<string, TimetableEntry>();
  for (const entry of entries) {
    cellMap.set(`${entry.dayOfWeek}-${entry.periodNumber}`, entry);
  }

  return { periods, cellMap };
}

export function ClassTimetableGrid({
  entries,
  emptyMessage = 'Chưa có tiết học.',
}: ClassTimetableGridProps) {
  if (entries.length === 0) {
    return <p className='text-sm text-muted-foreground'>{emptyMessage}</p>;
  }

  const { periods, cellMap } = buildGrid(entries);

  return (
    <div className='overflow-x-auto'>
      <table className='w-full min-w-[640px] border-collapse text-sm'>
        <thead>
          <tr>
            <th className='border bg-muted/50 px-3 py-2 text-left font-medium'>Tiết</th>
            {DEFAULT_DAYS.map((day) => (
              <th key={day} className='border bg-muted/50 px-3 py-2 text-left font-medium'>
                {DAY_OF_WEEK_LABELS[day]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {periods.map((period) => (
            <tr key={period}>
              <td className='border px-3 py-2 font-medium text-muted-foreground'>
                {period}
              </td>
              {DEFAULT_DAYS.map((day) => {
                const entry = cellMap.get(`${day}-${period}`);
                return (
                  <td key={day} className='border px-3 py-2 align-top'>
                    {entry ? (
                      <div className='space-y-0.5'>
                        <p className='font-medium'>{entry.courseSectionCode.split('-')[0]}</p>
                        <p className='text-xs text-muted-foreground'>{entry.courseSectionName}</p>
                        <p className='text-xs text-muted-foreground'>{entry.teacherFullName}</p>
                        {entry.room ? (
                          <p className='text-xs text-muted-foreground'>{entry.room}</p>
                        ) : null}
                      </div>
                    ) : (
                      <span className='text-muted-foreground/40'>—</span>
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
