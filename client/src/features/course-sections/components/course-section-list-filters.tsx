import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ALL_ACADEMIC_PERIODS } from '@/features/course-sections/api/course-sections-api';
import { selectClassName } from '@/lib/form-styles';
import { ACADEMIC_STATUS_LABELS } from '@/lib/labels';
import type { AcademicEntityStatus } from '@/types/api.types';

interface CourseSectionListFiltersProps {
  idPrefix?: string;
  globalFilter: string;
  onGlobalFilterChange: (value: string) => void;
  yearFilter?: string;
  semesterFilter?: string;
  subjectFilter?: string;
  statusFilter?: AcademicEntityStatus;
  years: Array<{ id: string; name: string; isCurrent: boolean }>;
  filterSemesters: Array<{ id: string; name: string; isCurrent: boolean }>;
  subjects: Array<{ id: string; name: string }>;
  onYearFilterChange: (value: string) => void;
  onSemesterFilterChange: (value: string) => void;
  onSubjectFilterChange: (value: string | undefined) => void;
  onStatusFilterChange: (value: AcademicEntityStatus | undefined) => void;
  /** Ẩn "Tất cả" năm học / học kỳ — dùng cho TKB portal */
  requireAcademicPeriod?: boolean;
  /** Chỉ hiện năm học + học kỳ */
  academicPeriodOnly?: boolean;
  /** Chỉ hiện bộ lọc năm học (không học kỳ) */
  yearOnly?: boolean;
}

export function CourseSectionListFilters({
  idPrefix = 'cs',
  globalFilter,
  onGlobalFilterChange,
  yearFilter,
  semesterFilter,
  subjectFilter,
  statusFilter,
  years,
  filterSemesters,
  subjects,
  onYearFilterChange,
  onSemesterFilterChange,
  onSubjectFilterChange,
  onStatusFilterChange,
  requireAcademicPeriod = false,
  academicPeriodOnly = false,
  yearOnly = false,
}: CourseSectionListFiltersProps) {
  return (
    <div
      className={
        yearOnly
          ? 'grid gap-3 sm:grid-cols-2'
          : academicPeriodOnly
          ? 'grid gap-3 sm:grid-cols-2'
          : 'grid gap-3 sm:grid-cols-2 lg:grid-cols-4'
      }
    >
      {!academicPeriodOnly ? (
        <div className='space-y-1.5'>
          <Label htmlFor={`${idPrefix}-search`}>Tìm kiếm</Label>
          <Input
            id={`${idPrefix}-search`}
            placeholder='Mã hoặc tên lớp môn...'
            value={globalFilter}
            onChange={(e) => onGlobalFilterChange(e.target.value)}
          />
        </div>
      ) : null}
      <div className='space-y-1.5'>
        <Label htmlFor={`${idPrefix}-filter-year`}>Năm học</Label>
        <select
          id={`${idPrefix}-filter-year`}
          className={selectClassName}
          value={yearFilter ?? ''}
          onChange={(e) => onYearFilterChange(e.target.value)}
        >
          {!requireAcademicPeriod ? (
            <option value={ALL_ACADEMIC_PERIODS}>Tất cả</option>
          ) : null}
          {years.map((year) => (
            <option key={year.id} value={year.id}>
              {year.name}
              {year.isCurrent ? ' (hiện tại)' : ''}
            </option>
          ))}
        </select>
      </div>
      {!yearOnly ? (
      <div className='space-y-1.5'>
        <Label htmlFor={`${idPrefix}-filter-semester`}>Học kỳ</Label>
        <select
          id={`${idPrefix}-filter-semester`}
          className={selectClassName}
          value={
            semesterFilter ??
            (requireAcademicPeriod ? (filterSemesters[0]?.id ?? '') : ALL_ACADEMIC_PERIODS)
          }
          disabled={!yearFilter}
          onChange={(e) => onSemesterFilterChange(e.target.value)}
        >
          {!requireAcademicPeriod ? (
            <option value={ALL_ACADEMIC_PERIODS}>Tất cả học kỳ</option>
          ) : null}
          {filterSemesters.map((semester) => (
            <option key={semester.id} value={semester.id}>
              {semester.name}
              {semester.isCurrent ? ' (hiện tại)' : ''}
            </option>
          ))}
        </select>
      </div>
      ) : null}
      {!academicPeriodOnly && !yearOnly ? (
        <>
      <div className='space-y-1.5'>
        <Label htmlFor={`${idPrefix}-filter-subject`}>Môn học</Label>
        <select
          id={`${idPrefix}-filter-subject`}
          className={selectClassName}
          value={subjectFilter ?? ''}
          onChange={(e) =>
            onSubjectFilterChange(e.target.value || undefined)
          }
        >
          <option value=''>Tất cả</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </select>
      </div>
      <div className='space-y-1.5'>
        <Label htmlFor={`${idPrefix}-filter-status`}>Trạng thái</Label>
        <select
          id={`${idPrefix}-filter-status`}
          className={selectClassName}
          value={statusFilter ?? ''}
          onChange={(e) =>
            onStatusFilterChange(
              (e.target.value || undefined) as AcademicEntityStatus | undefined,
            )
          }
        >
          <option value=''>Tất cả</option>
          {(Object.keys(ACADEMIC_STATUS_LABELS) as AcademicEntityStatus[]).map(
            (status) => (
              <option key={status} value={status}>
                {ACADEMIC_STATUS_LABELS[status]}
              </option>
            ),
          )}
        </select>
      </div>
        </>
      ) : null}
    </div>
  );
}
