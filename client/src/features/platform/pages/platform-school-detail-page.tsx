import { zodResolver } from '@hookform/resolvers/zod';
import { type ColumnDef } from '@tanstack/react-table';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { z } from 'zod';

import { ROUTES, getPlatformSchoolDetailPath } from '@/app/router/routes';
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
import { useAuth } from '@/features/auth/hooks/use-auth';
import { startPlatformImpersonation } from '@/features/platform/api/platform-impersonation-api';
import {
  createPlatformSchoolAdmin,
  fetchPlatformSchool,
  fetchPlatformSchoolAdmins,
  updatePlatformSchool,
  updatePlatformSchoolStatus,
  type PlatformSchoolAdmin,
  type SchoolStatus,
} from '@/features/platform/api/platform-schools-api';
import { getApiError } from '@/lib/api';
import { getErrorMessage } from '@/lib/error-messages';
import { selectClassName } from '@/lib/form-styles';
import { SCHOOL_STATUS_LABELS, SCHOOL_TYPE_LABELS, STATUS_LABELS } from '@/lib/labels';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  name: z.string().trim().min(1, 'Tên trường là bắt buộc'),
  shortName: z.string().optional(),
  schoolType: z.enum(['TH', 'THCS', 'THPT']),
  email: z.string().email('Email không hợp lệ').or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
});

const createAdminSchema = z.object({
  fullName: z.string().trim().min(1, 'Họ tên là bắt buộc'),
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự'),
});

type FormValues = z.infer<typeof formSchema>;
type CreateAdminFormValues = z.infer<typeof createAdminSchema>;

const STATUS_BADGE: Record<SchoolStatus, string> = {
  ACTIVE: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  INACTIVE: 'bg-muted text-muted-foreground',
  SUSPENDED: 'bg-destructive/10 text-destructive',
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('vi-VN');
}

export function PlatformSchoolDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { refetch } = useAuth();
  const queryClient = useQueryClient();
  const [showAdminForm, setShowAdminForm] = useState(false);

  const schoolQuery = useQuery({
    queryKey: ['platform-schools', id],
    queryFn: () => fetchPlatformSchool(id),
    enabled: Boolean(id),
  });

  const adminsQuery = useQuery({
    queryKey: ['platform-school-admins', id],
    queryFn: () => fetchPlatformSchoolAdmins(id),
    enabled: Boolean(id),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    values: schoolQuery.data
      ? {
          name: schoolQuery.data.name,
          shortName: schoolQuery.data.shortName ?? '',
          schoolType: schoolQuery.data.schoolType ?? 'THPT',
          email: schoolQuery.data.email ?? '',
          phone: schoolQuery.data.phone ?? '',
          address: schoolQuery.data.address ?? '',
        }
      : undefined,
  });

  const {
    register: registerAdmin,
    handleSubmit: handleSubmitAdmin,
    reset: resetAdmin,
    formState: {
      errors: adminErrors,
      isSubmitting: isSubmittingAdmin,
    },
  } = useForm<CreateAdminFormValues>({
    resolver: zodResolver(createAdminSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
    },
  });

  const adminColumns = useMemo<ColumnDef<PlatformSchoolAdmin>[]>(
    () => [
      { accessorKey: 'fullName', header: 'Họ tên' },
      { accessorKey: 'email', header: 'Email' },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => STATUS_LABELS[row.original.status],
      },
      {
        accessorKey: 'createdAt',
        header: 'Tạo lúc',
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
    ],
    [],
  );

  const updateMutation = useMutation({
    mutationFn: (values: FormValues) =>
      updatePlatformSchool(id, {
        name: values.name,
        shortName: values.shortName || null,
        schoolType: values.schoolType,
        email: values.email || null,
        phone: values.phone || null,
        address: values.address || null,
      }),
    onSuccess: (school) => {
      queryClient.setQueryData(['platform-schools', id], school);
      void queryClient.invalidateQueries({ queryKey: ['platform-schools'] });
      toast.success('Cập nhật trường thành công');
      reset({
        name: school.name,
        shortName: school.shortName ?? '',
        schoolType: school.schoolType ?? 'THPT',
        email: school.email ?? '',
        phone: school.phone ?? '',
        address: school.address ?? '',
      });
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(
        getErrorMessage(apiError?.code, apiError?.message ?? 'Cập nhật thất bại'),
      );
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: SchoolStatus) => updatePlatformSchoolStatus(id, status),
    onSuccess: (school) => {
      queryClient.setQueryData(['platform-schools', id], school);
      void queryClient.invalidateQueries({ queryKey: ['platform-schools'] });
      toast.success('Cập nhật trạng thái trường thành công');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(
        getErrorMessage(apiError?.code, apiError?.message ?? 'Cập nhật thất bại'),
      );
    },
  });

  const createAdminMutation = useMutation({
    mutationFn: (values: CreateAdminFormValues) =>
      createPlatformSchoolAdmin(id, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['platform-school-admins', id] });
      void queryClient.invalidateQueries({ queryKey: ['platform-schools', id] });
      void queryClient.invalidateQueries({ queryKey: ['platform-schools'] });
      toast.success('Thêm admin trường thành công');
      resetAdmin();
      setShowAdminForm(false);
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(
        getErrorMessage(apiError?.code, apiError?.message ?? 'Thêm admin thất bại'),
      );
    },
  });

  const impersonateMutation = useMutation({
    mutationFn: () => startPlatformImpersonation(id, 'read_only'),
    onSuccess: async (result) => {
      await refetch();
      queryClient.clear();
      toast.success(`Đang xem thay ${result.impersonation.targetSchoolName}`);
      navigate(result.redirectTo || ROUTES.home, { replace: true });
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(
        getErrorMessage(
          apiError?.code,
          apiError?.message ?? 'Không thể đăng nhập thay',
        ),
      );
    },
  });

  if (schoolQuery.isLoading) {
    return <LoadingState message='Đang tải thông tin trường…' />;
  }

  if (schoolQuery.isError || !schoolQuery.data) {
    return (
      <ErrorState
        message='Không tải được thông tin trường'
        onRetry={() => void schoolQuery.refetch()}
      />
    );
  }

  const school = schoolQuery.data;
  const admins = adminsQuery.data ?? [];

  return (
    <div className='mx-auto max-w-3xl space-y-6'>
      <div>
        <Link
          to={ROUTES.platformSchools}
          className='text-sm text-muted-foreground hover:text-foreground'
        >
          ← Danh sách trường
        </Link>
        <div className='mt-2 flex flex-wrap items-center gap-3'>
          <h1 className='text-2xl font-semibold'>{school.name}</h1>
          <span
            className={cn(
              'inline-flex rounded-md px-2 py-0.5 text-xs font-medium',
              STATUS_BADGE[school.status],
            )}
          >
            {SCHOOL_STATUS_LABELS[school.status]}
          </span>
          {school.status === 'ACTIVE' ? (
            <Button
              size='sm'
              variant='secondary'
              disabled={impersonateMutation.isPending}
              onClick={() => impersonateMutation.mutate()}
            >
              {impersonateMutation.isPending
                ? 'Đang vào…'
                : 'Đăng nhập thay'}
            </Button>
          ) : null}
        </div>
        <p className='text-sm text-muted-foreground'>
          Mã trường: {school.code}
        </p>
      </div>

      <div className='grid gap-4 md:grid-cols-3'>
        <Card>
          <CardHeader className='pb-2'>
            <CardDescription>Học sinh</CardDescription>
            <CardTitle className='text-2xl'>{school.stats.studentCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardDescription>Giáo viên</CardDescription>
            <CardTitle className='text-2xl'>{school.stats.teacherCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardDescription>Admin trường</CardDescription>
            <CardTitle className='text-2xl'>{admins.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
          <CardHeader className='flex flex-row items-center justify-between gap-4'>
            <div>
              <CardTitle>Quản trị viên trường</CardTitle>
              <CardDescription>
                Tài khoản SCHOOL_ADMIN có thể đăng nhập quản trị trường này
              </CardDescription>
            </div>
            <Button variant='outline' onClick={() => setShowAdminForm((v) => !v)}>
              {showAdminForm ? 'Đóng form' : 'Thêm admin'}
            </Button>
          </CardHeader>
          <CardContent className='space-y-4'>
            {showAdminForm ? (
              <form
                className='grid gap-4 md:grid-cols-2'
                onSubmit={handleSubmitAdmin((values) =>
                  createAdminMutation.mutate(values),
                )}
              >
                <div className='space-y-2'>
                  <Label htmlFor='adminFullName'>Họ tên</Label>
                  <Input id='adminFullName' {...registerAdmin('fullName')} />
                  {adminErrors.fullName ? (
                    <p className='text-sm text-destructive'>
                      {adminErrors.fullName.message}
                    </p>
                  ) : null}
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='adminEmail'>Email</Label>
                  <Input
                    id='adminEmail'
                    type='email'
                    {...registerAdmin('email')}
                  />
                  {adminErrors.email ? (
                    <p className='text-sm text-destructive'>
                      {adminErrors.email.message}
                    </p>
                  ) : null}
                </div>
                <div className='space-y-2 md:col-span-2'>
                  <Label htmlFor='adminPassword'>Mật khẩu</Label>
                  <Input
                    id='adminPassword'
                    type='password'
                    {...registerAdmin('password')}
                  />
                  {adminErrors.password ? (
                    <p className='text-sm text-destructive'>
                      {adminErrors.password.message}
                    </p>
                  ) : null}
                </div>
                <div className='md:col-span-2'>
                  <Button
                    type='submit'
                    disabled={isSubmittingAdmin || createAdminMutation.isPending}
                  >
                    {createAdminMutation.isPending ? 'Đang tạo…' : 'Tạo admin'}
                  </Button>
                </div>
              </form>
            ) : null}

            {adminsQuery.isLoading ? (
              <LoadingState message='Đang tải danh sách admin…' />
            ) : null}
            {adminsQuery.isError ? (
              <ErrorState
                message='Không tải được danh sách admin'
                onRetry={() => void adminsQuery.refetch()}
              />
            ) : null}
            {!adminsQuery.isLoading && !adminsQuery.isError ? (
              <DataTableGrid columns={adminColumns} data={admins} />
            ) : null}
          </CardContent>
        </Card>

      <Card>
          <CardHeader>
            <CardTitle>Trạng thái trường</CardTitle>
            <CardDescription>Khóa hoặc kích hoạt tenant</CardDescription>
          </CardHeader>
          <CardContent className='flex flex-wrap gap-2'>
            {school.status !== 'ACTIVE' ? (
              <Button
                variant='outline'
                disabled={statusMutation.isPending}
                onClick={() => statusMutation.mutate('ACTIVE')}
              >
                Kích hoạt
              </Button>
            ) : null}
            {school.status !== 'SUSPENDED' ? (
              <Button
                variant='outline'
                disabled={statusMutation.isPending}
                onClick={() => statusMutation.mutate('SUSPENDED')}
              >
                Tạm khóa
              </Button>
            ) : null}
            {school.status !== 'INACTIVE' ? (
              <Button
                variant='outline'
                disabled={statusMutation.isPending}
                onClick={() => statusMutation.mutate('INACTIVE')}
              >
                Ngưng hoạt động
              </Button>
            ) : null}
          </CardContent>
        </Card>

      <Card>
        <CardHeader>
          <CardTitle>Thông tin trường</CardTitle>
          <CardDescription>
            Tạo lúc {formatDateTime(school.createdAt)} · Cập nhật{' '}
            {formatDateTime(school.updatedAt)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className='space-y-4'
            onSubmit={handleSubmit((values) => updateMutation.mutate(values))}
          >
            <div className='space-y-2'>
              <Label htmlFor='name'>Tên trường</Label>
              <Input id='name' {...register('name')} />
              {errors.name ? (
                <p className='text-sm text-destructive'>{errors.name.message}</p>
              ) : null}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='shortName'>Tên viết tắt</Label>
              <Input id='shortName' {...register('shortName')} />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='schoolType'>Loại trường</Label>
              <select
                id='schoolType'
                className={selectClassName}
                {...register('schoolType')}
              >
                <option value='TH'>Tiểu học</option>
                <option value='THCS'>THCS</option>
                <option value='THPT'>THPT</option>
              </select>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='email'>Email liên hệ</Label>
              <Input id='email' type='email' {...register('email')} />
              {errors.email ? (
                <p className='text-sm text-destructive'>{errors.email.message}</p>
              ) : null}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='phone'>Số điện thoại</Label>
              <Input id='phone' {...register('phone')} />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='address'>Địa chỉ</Label>
              <Input id='address' {...register('address')} />
            </div>

            <Button
              type='submit'
              disabled={isSubmitting || updateMutation.isPending || !isDirty}
            >
              {updateMutation.isPending ? 'Đang lưu…' : 'Lưu thay đổi'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Metadata</CardTitle>
        </CardHeader>
        <CardContent className='space-y-1 text-sm'>
          <p>
            <span className='text-muted-foreground'>ID:</span> {school.id}
          </p>
          <p>
            <span className='text-muted-foreground'>Loại hiện tại:</span>{' '}
            {school.schoolType ? SCHOOL_TYPE_LABELS[school.schoolType] : '—'}
          </p>
          <p>
            <span className='text-muted-foreground'>URL:</span>{' '}
            {getPlatformSchoolDetailPath(school.id)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
