import { zodResolver } from '@hookform/resolvers/zod';
import type { ColumnFiltersState } from '@tanstack/react-table';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { ErrorState } from '@/components/feedback/error-state';
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
import { UsersTable } from '@/features/users/components/users-table';
import { getColumnFilterValue } from '@/features/users/lib/user-table-filters';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { getApiError } from '@/lib/api';
import { getErrorMessage } from '@/lib/error-messages';
import { ROLE_LABELS } from '@/lib/labels';
import type { UserRole, UserStatus } from '@/types/api.types';

import { createUser, fetchUsers, updateUserStatus } from '../api/users-api';

const createUserSchema = z.object({
  email: z.string().email('Email không đúng định dạng'),
  fullName: z.string().min(1, 'Họ tên là bắt buộc'),
  password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự'),
  role: z.enum(['SCHOOL_ADMIN', 'TEACHER', 'STUDENT']),
});

type CreateUserFormValues = z.infer<typeof createUserSchema>;

const USERS_PAGE_SIZE = 3;

export function UsersPage() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const debouncedSearch = useDebouncedValue(globalFilter, 300);
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);

  const roleFilter = getColumnFilterValue<UserRole>(columnFilters, 'role');
  const statusFilter = getColumnFilterValue<UserStatus>(columnFilters, 'status');

  const usersQuery = useQuery({
    queryKey: [
      'users',
      session?.activeSchoolId,
      debouncedSearch,
      roleFilter,
      statusFilter,
      page,
    ],
    queryFn: () =>
      fetchUsers({
        search: debouncedSearch || undefined,
        role: roleFilter,
        status: statusFilter,
        page,
        limit: USERS_PAGE_SIZE,
      }),
    enabled: Boolean(session?.activeSchoolId),
    placeholderData: keepPreviousData,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: '',
      fullName: '',
      password: '',
      role: 'TEACHER',
    },
  });

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] }); //  đánh dấu cache cũ là hết hạn và tự fetch lại dữ liệu mới với các queryKey liên quan, vd như 'users'
      toast.success('Tạo người dùng thành công');
      reset();
      setShowForm(false);
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(
        getErrorMessage(apiError?.code, apiError?.message ?? 'Tạo user thất bại'),
      );
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: UserStatus;
    }) => updateUserStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Cập nhật trạng thái thành công');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(
        getErrorMessage(
          apiError?.code,
          apiError?.message ?? 'Cập nhật thất bại',
        ),
      );
    },
  });

  const onSubmit = handleSubmit((values) => {
    createMutation.mutate(values);
  });

  const handleGlobalFilterChange = (value: string) => {
    setGlobalFilter(value);
    setPage(1);
  };

  const handleColumnFiltersChange = (filters: ColumnFiltersState) => {
    setColumnFilters(filters);
    setPage(1);
  };

  const handleClearFilters = () => {
    setGlobalFilter('');
    setColumnFilters([]);
    setPage(1);
  };

  const handleToggleStatus = useCallback(
    (id: string, status: UserStatus) => {
      statusMutation.mutate({ id, status });
    },
    [statusMutation],
  );

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-semibold'>Quản lý người dùng</h1>
          <p className='text-sm text-muted-foreground'>
            Tạo và quản lý tài khoản trong trường
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Đóng form' : 'Thêm người dùng'}
        </Button>
      </div>

      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle>Tạo người dùng mới</CardTitle>
            <CardDescription>
              Tài khoản sẽ thuộc trường {session?.activeSchool?.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className='grid gap-4 md:grid-cols-2'
              onSubmit={onSubmit}
            >
              <div className='space-y-2'>
                <Label htmlFor='fullName'>Họ tên</Label>
                <Input id='fullName' {...register('fullName')} />
                {errors.fullName ? (
                  <p className='text-sm text-destructive'>
                    {errors.fullName.message}
                  </p>
                ) : null}
              </div>
              <div className='space-y-2'>
                <Label htmlFor='email'>Email</Label>
                <Input id='email' type='email' {...register('email')} />
                {errors.email ? (
                  <p className='text-sm text-destructive'>
                    {errors.email.message}
                  </p>
                ) : null}
              </div>
              <div className='space-y-2'>
                <Label htmlFor='password'>Mật khẩu tạm</Label>
                <Input
                  id='password'
                  type='password'
                  {...register('password')}
                />
                {errors.password ? (
                  <p className='text-sm text-destructive'>
                    {errors.password.message}
                  </p>
                ) : null}
              </div>
              <div className='space-y-2'>
                <Label htmlFor='role'>Vai trò</Label>
                <select
                  id='role'
                  className='flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm'
                  {...register('role')}
                >
                  {(Object.keys(ROLE_LABELS) as UserRole[]).map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </option>
                  ))}
                </select>
              </div>
              <div className='md:col-span-2'>
                <Button type='submit' disabled={isSubmitting}>
                  {isSubmitting ? 'Đang tạo...' : 'Tạo người dùng'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Danh sách</CardTitle>
        </CardHeader>
        <CardContent>
          {usersQuery.isError ? (
            <ErrorState
              message='Không tải được danh sách người dùng'
              onRetry={() => void usersQuery.refetch()}
            />
          ) : null}
          {session?.activeSchoolId ? (
            <UsersTable
              data={usersQuery.data?.items ?? []}
              page={usersQuery.data?.meta.page ?? page}
              pageCount={usersQuery.data?.meta.totalPages ?? 1}
              isLoading={usersQuery.isLoading && !usersQuery.data}
              isFetching={usersQuery.isFetching}
              globalFilter={globalFilter}
              onGlobalFilterChange={handleGlobalFilterChange}
              columnFilters={columnFilters}
              onColumnFiltersChange={handleColumnFiltersChange}
              onClearFilters={handleClearFilters}
              onPageChange={setPage}
              currentUserId={session.user.id}
              onToggleStatus={handleToggleStatus}
              isStatusPending={statusMutation.isPending}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
