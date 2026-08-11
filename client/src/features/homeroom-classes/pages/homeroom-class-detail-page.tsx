import { zodResolver } from '@hookform/resolvers/zod';
import { type ColumnDef } from '@tanstack/react-table';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useParams } from 'react-router';
import { toast } from 'sonner';
import { z } from 'zod';

import { ROUTES } from '@/app/router/routes';
import { DataTableGrid } from '@/components/common/data-table-grid';
import { DataPagination } from '@/components/common/data-pagination';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { fetchAcademicYear } from '@/features/academic-years/api/academic-years-api';
import { useAuth } from '@/features/auth/hooks/use-auth';
import {
  fetchCourseSections,
  type CourseSection,
} from '@/features/course-sections/api/course-sections-api';
import { fetchGradeLevels } from '@/features/grade-levels/api/grade-levels-api';
import {
  fetchHomeroomClass,
  updateHomeroomClass,
  updateHomeroomClassStatus,
} from '@/features/homeroom-classes/api/homeroom-classes-api';
import {
  fetchStudents,
  type Student,
} from '@/features/students/api/students-api';
import { fetchTeachers } from '@/features/teachers/api/teachers-api';
import { getApiError } from '@/lib/api';
import { getErrorMessage } from '@/lib/error-messages';
import { selectClassName } from '@/lib/form-styles';
import { ACADEMIC_STATUS_LABELS } from '@/lib/labels';
import { cn } from '@/lib/utils';
import type { AcademicEntityStatus } from '@/types/api.types';

const PAGE_SIZE = 20;

const editSchema = z.object({
  name: z.string().trim().min(1, 'Tên lớp là bắt buộc'),
  code: z.string().trim().min(1, 'Mã lớp là bắt buộc'),
  capacity: z.string().optional(),
  homeroomTeacherId: z.string().optional(),
});

type EditFormValues = z.infer<typeof editSchema>;

const STATUS_BADGE: Record<AcademicEntityStatus, string> = {
  ACTIVE: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  INACTIVE: 'bg-muted text-muted-foreground',
};

export function HomeroomClassDetailPage() {
  const { id = '' } = useParams();
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [studentsPage, setStudentsPage] = useState(1);
  const [sectionsPage, setSectionsPage] = useState(1);

  const classQuery = useQuery({
    queryKey: ['homeroom-classes', id],
    queryFn: () => fetchHomeroomClass(id),
    enabled: Boolean(id),
  });

  const homeroomClass = classQuery.data;

  const yearQuery = useQuery({
    queryKey: ['academic-years', homeroomClass?.academicYearId],
    queryFn: () => fetchAcademicYear(homeroomClass!.academicYearId),
    enabled: Boolean(homeroomClass?.academicYearId),
  });

  const gradesQuery = useQuery({
    queryKey: ['grade-levels', session?.activeSchoolId, 'detail-lookup'],
    queryFn: () => fetchGradeLevels({ limit: 100, page: 1 }),
    enabled: Boolean(session?.activeSchoolId && homeroomClass),
  });

  const teachersQuery = useQuery({
    queryKey: [
      'teachers',
      session?.activeSchoolId,
      'available-homeroom',
      homeroomClass?.academicYearId,
      id,
    ],
    queryFn: () =>
      fetchTeachers({
        limit: 100,
        page: 1,
        status: 'ACTIVE',
        availableAsHomeroomForAcademicYearId: homeroomClass!.academicYearId,
        excludeHomeroomClassId: id,
      }),
    enabled: Boolean(
      session?.activeSchoolId && homeroomClass?.academicYearId && id,
    ),
  });

  const studentsQuery = useQuery({
    queryKey: [
      'students',
      'homeroom-class',
      id,
      homeroomClass?.academicYearId,
      studentsPage,
    ],
    queryFn: () =>
      fetchStudents({
        homeroomClassId: id,
        academicYearId: homeroomClass!.academicYearId,
        page: studentsPage,
        limit: PAGE_SIZE,
      }),
    enabled: Boolean(id && homeroomClass?.academicYearId),
    placeholderData: keepPreviousData,
  });

  const sectionsQuery = useQuery({
    queryKey: [
      'course-sections',
      'homeroom-class',
      id,
      homeroomClass?.academicYearId,
      sectionsPage,
    ],
    queryFn: () =>
      fetchCourseSections({
        homeroomClassId: id,
        academicYearId: homeroomClass!.academicYearId,
        page: sectionsPage,
        limit: PAGE_SIZE,
      }),
    enabled: Boolean(id && homeroomClass?.academicYearId),
    placeholderData: keepPreviousData,
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    values: homeroomClass
      ? {
          name: homeroomClass.name,
          code: homeroomClass.code,
          capacity:
            homeroomClass.capacity != null
              ? String(homeroomClass.capacity)
              : '',
          homeroomTeacherId: homeroomClass.homeroomTeacherId ?? '',
        }
      : undefined,
  });

  const updateMutation = useMutation({
    mutationFn: (values: EditFormValues) =>
      updateHomeroomClass(id, {
        name: values.name,
        code: values.code,
        capacity: values.capacity?.trim()
          ? Number(values.capacity)
          : null,
        homeroomTeacherId: values.homeroomTeacherId || null,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['homeroom-classes', id], updated);
      void queryClient.invalidateQueries({ queryKey: ['homeroom-classes'] });
      void queryClient.invalidateQueries({ queryKey: ['teachers'] });
      toast.success('Cập nhật lớp hành chính thành công');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(
        getErrorMessage(apiError?.code, apiError?.message ?? 'Cập nhật thất bại'),
      );
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: AcademicEntityStatus) =>
      updateHomeroomClassStatus(id, status),
    onSuccess: (updated) => {
      queryClient.setQueryData(['homeroom-classes', id], updated);
      void queryClient.invalidateQueries({ queryKey: ['homeroom-classes'] });
      toast.success('Cập nhật trạng thái thành công');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(
        getErrorMessage(apiError?.code, apiError?.message ?? 'Cập nhật thất bại'),
      );
    },
  });

  const gradeName = useMemo(() => {
    if (!homeroomClass) return '—';
    return (
      gradesQuery.data?.items.find((g) => g.id === homeroomClass.gradeLevelId)
        ?.name ?? '—'
    );
  }, [gradesQuery.data?.items, homeroomClass]);

  const teachers = teachersQuery.data?.items ?? [];
  const missingTeacherId =
    homeroomClass?.homeroomTeacherId &&
    !teachers.some((t) => t.id === homeroomClass.homeroomTeacherId)
      ? homeroomClass.homeroomTeacherId
      : null;

  const studentColumns = useMemo<ColumnDef<Student>[]>(
    () => [
      {
        accessorKey: 'fullName',
        header: 'Họ tên',
        cell: ({ row }) => (
          <Link
            to={`${ROUTES.students}/${row.original.id}`}
            className='font-medium text-primary hover:underline'
          >
            {row.original.fullName}
          </Link>
        ),
      },
      {
        accessorKey: 'externalCode',
        header: 'Mã HS',
        cell: ({ row }) => row.original.externalCode ?? '—',
      },
      {
        id: 'enrollment',
        header: 'Ghi danh hiện tại',
        cell: ({ row }) => {
          const enrollment = row.original.currentEnrollment;
          if (!enrollment) return '—';
          return `${enrollment.semesterName} · ${enrollment.homeroomClassCode}`;
        },
      },
      {
        accessorKey: 'status',
        header: 'Trạng thái HS',
        cell: ({ row }) => (
          <span
            className={cn(
              'inline-flex rounded-md px-2 py-0.5 text-xs font-medium',
              STATUS_BADGE[row.original.status],
            )}
          >
            {ACADEMIC_STATUS_LABELS[row.original.status]}
          </span>
        ),
      },
    ],
    [],
  );

  const sectionColumns = useMemo<ColumnDef<CourseSection>[]>(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã lớp môn',
        cell: ({ row }) => (
          <Link
            to={`${ROUTES.courseSections}/${row.original.id}`}
            className='font-medium text-primary hover:underline'
          >
            {row.original.code}
          </Link>
        ),
      },
      { accessorKey: 'name', header: 'Tên lớp môn' },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => (
          <span
            className={cn(
              'inline-flex rounded-md px-2 py-0.5 text-xs font-medium',
              STATUS_BADGE[row.original.status],
            )}
          >
            {ACADEMIC_STATUS_LABELS[row.original.status]}
          </span>
        ),
      },
    ],
    [],
  );

  if (classQuery.isLoading) {
    return <LoadingState />;
  }

  if (classQuery.isError || !homeroomClass) {
    return (
      <ErrorState
        message='Không tải được chi tiết lớp hành chính'
        onRetry={() => void classQuery.refetch()}
      />
    );
  }

  const students = studentsQuery.data?.items ?? [];
  const sections = sectionsQuery.data?.items ?? [];

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <Link
            to={ROUTES.homeroomClasses}
            className='text-sm text-muted-foreground hover:text-foreground'
          >
            ← Danh sách lớp hành chính
          </Link>
          <h1 className='mt-2 text-2xl font-semibold'>
            {homeroomClass.code} — {homeroomClass.name}
          </h1>
          <p className='text-sm text-muted-foreground'>
            {yearQuery.data?.name ?? '…'} · Khối {gradeName}
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <span
            className={cn(
              'inline-flex rounded-md px-2 py-0.5 text-xs font-medium',
              STATUS_BADGE[homeroomClass.status],
            )}
          >
            {ACADEMIC_STATUS_LABELS[homeroomClass.status]}
          </span>
          <Button
            variant='outline'
            size='sm'
            disabled={statusMutation.isPending}
            onClick={() =>
              statusMutation.mutate(
                homeroomClass.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
              )
            }
          >
            {homeroomClass.status === 'ACTIVE' ? 'Ngưng' : 'Kích hoạt'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Thông tin lớp</CardTitle>
          <CardDescription>
            Cập nhật tên, mã, sĩ số tối đa và giáo viên chủ nhiệm
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className='grid gap-4 md:grid-cols-2'
            onSubmit={handleSubmit((values) => updateMutation.mutate(values))}
          >
            <div className='space-y-2'>
              <Label htmlFor='hc-code'>Mã lớp</Label>
              <Input id='hc-code' {...register('code')} />
              {errors.code ? (
                <p className='text-sm text-destructive'>{errors.code.message}</p>
              ) : null}
            </div>
            <div className='space-y-2'>
              <Label htmlFor='hc-name'>Tên lớp</Label>
              <Input id='hc-name' {...register('name')} />
              {errors.name ? (
                <p className='text-sm text-destructive'>{errors.name.message}</p>
              ) : null}
            </div>
            <div className='space-y-2'>
              <Label htmlFor='hc-capacity'>Sĩ số tối đa</Label>
              <Input
                id='hc-capacity'
                type='number'
                min={1}
                {...register('capacity')}
                placeholder='Không giới hạn'
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='hc-teacher'>GVCN</Label>
              <select
                id='hc-teacher'
                className={selectClassName}
                {...register('homeroomTeacherId')}
              >
                <option value=''>Chưa gán</option>
                {missingTeacherId ? (
                  <option value={missingTeacherId}>
                    GVCN hiện tại (không có trong danh sách)
                  </option>
                ) : null}
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.fullName}
                    {teacher.status !== 'ACTIVE'
                      ? ` (${ACADEMIC_STATUS_LABELS[teacher.status]})`
                      : ''}
                  </option>
                ))}
              </select>
              <p className='text-xs text-muted-foreground'>
                Chỉ hiện GV chưa làm GVCN lớp ACTIVE khác trong cùng năm học.
              </p>
            </div>
            <div className='md:col-span-2'>
              <Button
                type='submit'
                disabled={
                  isSubmitting || updateMutation.isPending || !isDirty
                }
              >
                {updateMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Học sinh trong lớp</CardTitle>
          <CardDescription>
            Học sinh có ghi danh thuộc lớp này trong năm học của lớp
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          {studentsQuery.isError ? (
            <ErrorState
              message='Không tải được danh sách học sinh'
              onRetry={() => void studentsQuery.refetch()}
            />
          ) : null}

          {studentsQuery.isLoading ? (
            <LoadingState message='Đang tải học sinh...' />
          ) : students.length === 0 ? (
            <EmptyState
              title='Chưa có học sinh'
              description='Ghi danh học sinh vào lớp từ hồ sơ học sinh'
            />
          ) : (
            <DataTableGrid data={students} columns={studentColumns} />
          )}

          {!studentsQuery.isLoading && students.length > 0 ? (
            <DataPagination
              page={studentsQuery.data?.meta.page ?? studentsPage}
              totalPages={studentsQuery.data?.meta.totalPages ?? 1}
              onPageChange={setStudentsPage}
            />
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lớp môn học gắn lớp HC</CardTitle>
          <CardDescription>
            Các lớp môn trong cùng năm học được gắn với lớp hành chính này
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          {sectionsQuery.isError ? (
            <ErrorState
              message='Không tải được danh sách lớp môn'
              onRetry={() => void sectionsQuery.refetch()}
            />
          ) : null}

          {sectionsQuery.isLoading ? (
            <LoadingState message='Đang tải lớp môn...' />
          ) : sections.length === 0 ? (
            <EmptyState
              title='Chưa có lớp môn'
              description='Tạo lớp môn học và gắn với lớp hành chính này'
            />
          ) : (
            <DataTableGrid data={sections} columns={sectionColumns} />
          )}

          {!sectionsQuery.isLoading && sections.length > 0 ? (
            <DataPagination
              page={sectionsQuery.data?.meta.page ?? sectionsPage}
              totalPages={sectionsQuery.data?.meta.totalPages ?? 1}
              onPageChange={setSectionsPage}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
