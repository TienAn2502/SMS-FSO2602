import { zodResolver } from '@hookform/resolvers/zod';
import { type ColumnDef } from '@tanstack/react-table';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useParams } from 'react-router';
import { toast } from 'sonner';
import { z } from 'zod';

import { ROUTES } from '@/app/router/routes';
import { DataTableGrid } from '@/components/common/data-table-grid';
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
import { StudentEnrollmentActions } from '@/features/students/components/student-enrollment-actions';
import {
  fetchStudent,
  updateStudent,
} from '@/features/students/api/students-api';
import {
  fetchStudentEnrollments,
  type StudentEnrollment,
} from '@/features/student-enrollments/api/student-enrollments-api';
import { formatDateVi } from '@/lib/date-format';
import { getApiError } from '@/lib/api';
import { getErrorMessage } from '@/lib/error-messages';
import { selectClassName } from '@/lib/form-styles';
import {
  getEnrollmentStatusBadgeClass,
  getEnrollmentStatusLabel,
} from '@/lib/enrollment-display';
import {
  ACADEMIC_STATUS_LABELS,
  GENDER_LABELS,
  PARENT_RELATIONSHIP_LABELS,
} from '@/lib/labels';
import { cn } from '@/lib/utils';

const profileSchema = z.object({
  fullName: z.string().trim().min(1, 'Họ tên là bắt buộc'),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const STATUS_BADGE = {
  ACTIVE: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  INACTIVE: 'bg-muted text-muted-foreground',
} as const;

export function StudentDetailPage() {
  const { id = '' } = useParams();
  const queryClient = useQueryClient();

  const studentQuery = useQuery({
    queryKey: ['students', id],
    queryFn: () => fetchStudent(id),
    enabled: Boolean(id),
  });

  const enrollmentsQuery = useQuery({
    queryKey: ['student-enrollments', id],
    queryFn: () => fetchStudentEnrollments(id, { limit: 50, sortOrder: 'desc' }),
    enabled: Boolean(id),
    placeholderData: keepPreviousData,
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    values: studentQuery.data
      ? {
          fullName: studentQuery.data.fullName,
          dateOfBirth: studentQuery.data.dateOfBirth ?? '',
          gender: studentQuery.data.gender ?? undefined,
          phone: studentQuery.data.phone ?? '',
          address: studentQuery.data.address ?? '',
        }
      : undefined,
  });

  const updateMutation = useMutation({
    mutationFn: (values: ProfileFormValues) =>
      updateStudent(id, {
        fullName: values.fullName,
        dateOfBirth: values.dateOfBirth || null,
        gender: values.gender ?? null,
        phone: values.phone || null,
        address: values.address || null,
      }),
    onSuccess: (student) => {
      queryClient.setQueryData(['students', id], student);
      void queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('Cập nhật hồ sơ thành công');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(getErrorMessage(apiError?.code, apiError?.message ?? 'Cập nhật thất bại'));
    },
  });

  const enrollmentColumns = useMemo<ColumnDef<StudentEnrollment>[]>(
    () => [
      {
        id: 'semester',
        header: 'Học kỳ',
        cell: ({ row }) =>
          `${row.original.semesterName} (${row.original.academicYearName})`,
      },
      {
        id: 'class',
        header: 'Lớp HC',
        cell: ({ row }) => `${row.original.homeroomClassCode} — ${row.original.homeroomClassName}`,
      },
      {
        accessorKey: 'enrolledAt',
        header: 'Ngày vào',
        cell: ({ row }) => formatDateVi(row.original.enrolledAt),
      },
      {
        accessorKey: 'leftAt',
        header: 'Ngày rời',
        cell: ({ row }) => formatDateVi(row.original.leftAt),
      },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => (
          <span
            className={cn(
              'inline-flex rounded-md px-2 py-0.5 text-xs font-medium',
              getEnrollmentStatusBadgeClass(row.original),
            )}
          >
            {getEnrollmentStatusLabel(row.original)}
          </span>
        ),
      },
      {
        accessorKey: 'note',
        header: 'Ghi chú',
        cell: ({ row }) => row.original.note ?? '—',
      },
    ],
    [],
  );

  if (studentQuery.isLoading) {
    return <LoadingState />;
  }

  if (studentQuery.isError || !studentQuery.data) {
    return (
      <ErrorState
        message='Không tải được thông tin học sinh'
        onRetry={() => void studentQuery.refetch()}
      />
    );
  }

  const student = studentQuery.data;
  const enrollments = enrollmentsQuery.data?.items ?? [];
  const activeEnrollment =
    enrollments.find(
      (e) => e.status === 'ACTIVE' && e.semesterIsCurrent,
    ) ??
    enrollments.find((e) => e.status === 'ACTIVE') ??
    (student.currentEnrollment
      ? enrollments.find((e) => e.id === student.currentEnrollment?.id) ?? null
      : null);
  const activeEnrollments = enrollments.filter((e) => e.status === 'ACTIVE');

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <div>
          <Button variant='ghost' size='sm' render={<Link to={ROUTES.students} />}>
            ← Danh sách học sinh
          </Button>
          <h1 className='mt-2 text-2xl font-semibold'>{student.fullName}</h1>
          <p className='text-sm text-muted-foreground'>
            {student.userEmail ?? 'Chưa có tài khoản đăng nhập'}
          </p>
        </div>
        <span
          className={cn(
            'inline-flex rounded-md px-2.5 py-1 text-xs font-medium',
            STATUS_BADGE[student.status],
          )}
        >
          {ACADEMIC_STATUS_LABELS[student.status]}
        </span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Hồ sơ học sinh</CardTitle>
          <CardDescription>Cập nhật thông tin cá nhân</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className='grid gap-4 md:grid-cols-2'
            onSubmit={handleSubmit((values) => updateMutation.mutate(values))}
          >
            <div className='space-y-2 md:col-span-2'>
              <Label htmlFor='fullName'>Họ tên</Label>
              <Input id='fullName' {...register('fullName')} />
              {errors.fullName ? (
                <p className='text-sm text-destructive'>{errors.fullName.message}</p>
              ) : null}
            </div>
            <div className='space-y-2'>
              <Label htmlFor='dateOfBirth'>Ngày sinh</Label>
              <Input id='dateOfBirth' type='date' {...register('dateOfBirth')} />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='gender'>Giới tính</Label>
              <select id='gender' className={selectClassName} {...register('gender')}>
                <option value=''>Chưa chọn</option>
                {(Object.keys(GENDER_LABELS) as Array<keyof typeof GENDER_LABELS>).map(
                  (gender) => (
                    <option key={gender} value={gender}>
                      {GENDER_LABELS[gender]}
                    </option>
                  ),
                )}
              </select>
            </div>
            <div className='space-y-2'>
              <Label htmlFor='phone'>Số điện thoại</Label>
              <Input id='phone' {...register('phone')} />
            </div>
            <div className='space-y-2 md:col-span-2'>
              <Label htmlFor='address'>Địa chỉ</Label>
              <Input id='address' {...register('address')} />
            </div>
            <div className='md:col-span-2'>
              <Button type='submit' disabled={isSubmitting || !isDirty}>
                {isSubmitting ? 'Đang lưu...' : 'Lưu hồ sơ'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Phụ huynh liên kết</CardTitle>
          <CardDescription>Thông tin PH gắn với học sinh này</CardDescription>
        </CardHeader>
        <CardContent>
          {(student.linkedParents?.length ?? 0) === 0 ? (
            <p className='text-sm text-muted-foreground'>Chưa gắn phụ huynh</p>
          ) : (
            <ul className='space-y-2'>
              {student.linkedParents!.map((link) => (
                <li
                  key={link.id}
                  className='flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm'
                >
                  <div>
                    <Link
                      to={`${ROUTES.parents}/${link.parentId}`}
                      className='font-medium text-primary hover:underline'
                    >
                      {link.parentFullName}
                    </Link>
                    <p className='mt-0.5 text-muted-foreground'>
                      {PARENT_RELATIONSHIP_LABELS[link.relationship]}
                      {link.isPrimaryContact ? ' · Liên hệ chính' : ''}
                      {link.parentExternalCode
                        ? ` · ${link.parentExternalCode}`
                        : ''}
                      {link.parentPhone ? ` · ${link.parentPhone}` : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ghi danh hiện tại</CardTitle>
          <CardDescription>
            {activeEnrollment
              ? `${activeEnrollment.homeroomClassCode} — ${activeEnrollment.semesterName} (${activeEnrollment.academicYearName})`
              : 'Học sinh chưa được ghi danh lớp hành chính (ACTIVE)'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StudentEnrollmentActions
            student={student}
            activeEnrollment={activeEnrollment}
            activeEnrollments={activeEnrollments}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lịch sử ghi danh</CardTitle>
        </CardHeader>
        <CardContent>
          {enrollmentsQuery.isLoading ? (
            <LoadingState message='Đang tải lịch sử...' />
          ) : enrollments.length === 0 ? (
            <p className='text-sm text-muted-foreground'>Chưa có lịch sử ghi danh</p>
          ) : (
            <DataTableGrid
              data={enrollments}
              columns={enrollmentColumns}
              getRowHref={(enrollment) =>
                `${ROUTES.studentEnrollments}/${enrollment.id}`
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
