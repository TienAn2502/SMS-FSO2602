import type { TimetableEntry } from '@/features/timetable/api/timetable-entries-api';
import { DAY_OF_WEEK_LABELS } from '@/lib/labels';

interface TimetableEntryListProps {
  entries: TimetableEntry[];
  emptyMessage?: string;
}

export function TimetableEntryList({
  entries,
  emptyMessage = 'Chưa có tiết học.',
}: TimetableEntryListProps) {
  if (entries.length === 0) {
    return <p className='text-sm text-muted-foreground'>{emptyMessage}</p>;
  }

  return (
    <div className='overflow-x-auto'>
      <table className='w-full min-w-[720px] border-collapse text-sm'>
        <thead>
          <tr className='border-b text-left text-muted-foreground'>
            <th className='py-2 pr-4 font-medium'>Thứ</th>
            <th className='py-2 pr-4 font-medium'>Tiết</th>
            <th className='py-2 pr-4 font-medium'>Lớp môn</th>
            <th className='py-2 pr-4 font-medium'>Tên lớp môn</th>
            <th className='py-2 pr-4 font-medium'>Giáo viên</th>
            <th className='py-2 font-medium'>Phòng</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id} className='border-b'>
              <td className='py-2 pr-4'>
                {DAY_OF_WEEK_LABELS[entry.dayOfWeek] ?? entry.dayOfWeek}
              </td>
              <td className='py-2 pr-4'>{entry.periodNumber}</td>
              <td className='py-2 pr-4 font-medium'>{entry.courseSectionCode}</td>
              <td className='py-2 pr-4'>{entry.courseSectionName}</td>
              <td className='py-2 pr-4'>{entry.teacherFullName}</td>
              <td className='py-2'>{entry.room ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
