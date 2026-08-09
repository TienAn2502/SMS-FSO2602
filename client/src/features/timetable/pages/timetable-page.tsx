import { zodResolver } from '@hookform/resolvers/zod';
import { type ColumnDef } from '@tanstack/react-table';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { DataTableGrid } from '@/components/common/data-table-grid';
import { DataPagination } from '@/components/common/data-pagination';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { CourseSectionListFilters } from '@/features/course-sections/components/course-section-list-filters';
import { useCourseSectionListFilters } from '@/features/course-sections/hooks/use-course-section-list-filters';
import { fetchCourseSections } from '@/features/course-sections/api/course-sections-api';
import { fetchHomeroomClasses } from '@/features/homeroom-classes/api/homeroom-classes-api';
import { fetchAllTeachers } from '@/features/teachers/api/teachers-api';
import { TimetableImportExportActions } from '@/features/timetable/components/timetable-import-export-actions';
import {
  createTimetableEntry,
  deleteTimetableEntry,
  fetchTimetableEntries,
  type TimetableEntry,
} from '@/features/timetable/api/timetable-entries-api';
import { getApiError } from '@/lib/api';
import { getErrorMessage } from '@/lib/error-messages';
import { selectClassName } from '@/lib/form-styles';
import { DAY_OF_WEEK_LABELS } from '@/lib/labels';

const PAGE_SIZE = 20;

const createSchema = z.object({
  courseSectionId: z.string().uuid(),
  teacherId: z.string().uuid(),
  dayOfWeek: z.number().int().min(1).max(5),
  periodNumber: z.number().int().min(1).max(12),
  room: z.string().optional(),
});

export function TimetablePage() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [homeroomClassId, setHomeroomClassId] = useState('');
  const [teacherId, setTeacherId] = useState('');

  const {
    debouncedSearch,
    yearFilter,
    semesterFilter,
    subjectFilter,
    statusFilter,
    filtersReady,
    globalFilter,
    years,
    subjects,
    filterSemesters,
    setGlobalFilter,
    setYearFilter,
    setSemesterFilter,
    setSubjectFilter,
    setStatusFilter,
  } = useCourseSectionListFilters(() => undefined, {
    requireAcademicPeriod: true,
  });

  const filterParams = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      academicYearId: yearFilter,
      semesterId: semesterFilter,
      subjectId: subjectFilter,
      status: statusFilter,
      homeroomClassId: homeroomClassId || undefined,
      teacherId: teacherId || undefined,
    }),
    [
      debouncedSearch,
      yearFilter,
      semesterFilter,
      subjectFilter,
      statusFilter,
      homeroomClassId,
      teacherId,
    ],
  );

  const listQuery = useQuery({
    queryKey: ['timetable-entries', session?.activeSchoolId, page, filterParams],
    queryFn: () =>
      fetchTimetableEntries({
        page,
        limit: PAGE_SIZE,
        ...filterParams,
      }),
    enabled: Boolean(session?.activeSchoolId && filtersReady),
    placeholderData: keepPreviousData,
  });

  const teachersQuery = useQuery({
    queryKey: ['teachers', session?.activeSchoolId, 'all'],
    queryFn: fetchAllTeachers,
    enabled: Boolean(session?.activeSchoolId),
  });

  const homeroomClassesQuery = useQuery({
    queryKey: ['homeroom-classes', session?.activeSchoolId, yearFilter],
    queryFn: () =>
      fetchHomeroomClasses({
        limit: 100,
        status: 'ACTIVE',
        academicYearId: yearFilter,
      }),
    enabled: Boolean(session?.activeSchoolId && yearFilter),
  });

  const sectionsQuery = useQuery({
    queryKey: ['course-sections', session?.activeSchoolId, 'all'],
    queryFn: () => fetchCourseSections({ limit: 100, status: 'ACTIVE' }),
    enabled: Boolean(session?.activeSchoolId && showForm),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof createSchema>>({
    resolver: zodResolver(createSchema),
    defaultValues: { dayOfWeek: 1, periodNumber: 1 },
  });

  const createMutation = useMutation({
    mutationFn: createTimetableEntry,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['timetable-entries'] });
      toast.success('Thêm tiết học thành công');
      reset({ dayOfWeek: 1, periodNumber: 1 });
      setShowForm(false);
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(
        getErrorMessage(apiError?.code, apiError?.message ?? 'Thêm tiết thất bại'),
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTimetableEntry,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['timetable-entries'] });
      toast.success('Đã xóa tiết học');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(getErrorMessage(apiError?.code, apiError?.message ?? 'Xóa thất bại'));
    },
  });

  const columns = useMemo<ColumnDef<TimetableEntry>[]>(
    () => [
      {
        accessorKey: 'dayOfWeek',
        header: 'Thứ',
        cell: ({ row }) =>
          DAY_OF_WEEK_LABELS[row.original.dayOfWeek] ?? row.original.dayOfWeek,
      },
      { accessorKey: 'periodNumber', header: 'Tiết' },
      { accessorKey: 'courseSectionCode', header: 'Lớp môn' },
      { accessorKey: 'teacherFullName', header: 'Giáo viên' },
      {
        accessorKey: 'room',
        header: 'Phòng',
        cell: ({ row }) => row.original.room ?? '—',
      },
      {
        id: 'actions',
        cell: ({ row }) => (
          <Button
            variant='outline'
            size='sm'
            onClick={() => deleteMutation.mutate(row.original.id)}
          >
            Xóa
          </Button>
        ),
      },
    ],
    [deleteMutation],
  );

  const items = listQuery.data?.items ?? [];
  const totalItems = listQuery.data?.meta.total ?? 0;

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-semibold'>Thời khóa biểu</h1>
          <p className='text-sm text-muted-foreground'>
            Quản lý tiết học theo học kỳ; import/export Excel ma trận (mỗi lớp một sheet)
          </p>
        </div>
        <div className='flex flex-wrap gap-2'>
          <TimetableImportExportActions
            exportParams={filterParams}
            exportDisabled={!filtersReady || totalItems === 0}
            initialAcademicYearId={yearFilter}
            initialSemesterId={semesterFilter}
            onImportSuccess={() => {
              void queryClient.invalidateQueries({
                queryKey: ['timetable-entries'],
              });
            }}
          />
          <Button onClick={() => setShowForm((value) => !value)}>
            {showForm ? 'Đóng form' : 'Thêm tiết'}
          </Button>
        </div>
      </div>

      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle>Tiết học mới</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className='grid gap-4 md:grid-cols-3'
              onSubmit={handleSubmit((values) => createMutation.mutate(values))}
            >
              <div className='space-y-2'>
                <Label>Lớp môn</Label>
                <select className={selectClassName} {...register('courseSectionId')}>
                  <option value=''>— Chọn —</option>
                  {sectionsQuery.data?.items.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.code}
                    </option>
                  ))}
                </select>
              </div>
              <div className='space-y-2'>
                <Label>Giáo viên</Label>
                <select className={selectClassName} {...register('teacherId')}>
                  <option value=''>— Chọn —</option>
                  {teachersQuery.data?.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div className='space-y-2'>
                <Label>Thứ</Label>
                <select className={selectClassName} {...register('dayOfWeek')}>
                  {[1, 2, 3, 4, 5].map((day) => (
                    <option key={day} value={day}>
                      {DAY_OF_WEEK_LABELS[day]}
                    </option>
                  ))}
                </select>
              </div>
              <div className='space-y-2'>
                <Label>Tiết</Label>
                <Input
                  type='number'
                  min={1}
                  max={12}
                  {...register('periodNumber', { valueAsNumber: true })}
                />
              </div>
              <div className='space-y-2'>
                <Label>Phòng</Label>
                <Input {...register('room')} placeholder='P.201' />
              </div>
              <div className='flex items-end'>
                <Button
                  type='submit'
                  disabled={isSubmitting || createMutation.isPending}
                >
                  Lưu
                </Button>
              </div>
              {errors.courseSectionId ? (
                <p className='text-sm text-destructive md:col-span-3'>
                  {errors.courseSectionId.message}
                </p>
              ) : null}
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Danh sách tiết học</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <CourseSectionListFilters
            idPrefix='admin-tkb'
            requireAcademicPeriod
            globalFilter={globalFilter}
            onGlobalFilterChange={setGlobalFilter}
            yearFilter={yearFilter}
            semesterFilter={semesterFilter}
            subjectFilter={subjectFilter}
            statusFilter={statusFilter}
            years={years}
            filterSemesters={filterSemesters}
            subjects={subjects}
            onYearFilterChange={setYearFilter}
            onSemesterFilterChange={setSemesterFilter}
            onSubjectFilterChange={setSubjectFilter}
            onStatusFilterChange={setStatusFilter}
          />

          <div className='grid gap-3 sm:grid-cols-2'>
            <div className='space-y-1.5'>
              <Label htmlFor='admin-tkb-homeroom'>Lớp hành chính</Label>
              <select
                id='admin-tkb-homeroom'
                className={selectClassName}
                value={homeroomClassId}
                onChange={(event) => setHomeroomClassId(event.target.value)}
              >
                <option value=''>Tất cả</option>
                {homeroomClassesQuery.data?.items.map((homeroomClass) => (
                  <option key={homeroomClass.id} value={homeroomClass.id}>
                    {homeroomClass.code} — {homeroomClass.name}
                  </option>
                ))}
              </select>
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='admin-tkb-teacher'>Giáo viên</Label>
              <select
                id='admin-tkb-teacher'
                className={selectClassName}
                value={teacherId}
                onChange={(event) => setTeacherId(event.target.value)}
              >
                <option value=''>Tất cả</option>
                {teachersQuery.data?.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.fullName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {listQuery.isLoading || !filtersReady ? <LoadingState /> : null}
          {listQuery.isError ? (
            <ErrorState
              message='Không tải được thời khóa biểu'
              onRetry={() => void listQuery.refetch()}
            />
          ) : null}
          {listQuery.isSuccess && items.length === 0 ? (
            <EmptyState title='Chưa có tiết học với bộ lọc đã chọn' />
          ) : null}
          {listQuery.isSuccess && items.length > 0 ? (
            <>
              <DataTableGrid columns={columns} data={items} />
              <DataPagination
                page={page}
                totalPages={listQuery.data.meta.totalPages}
                onPageChange={setPage}
              />
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
