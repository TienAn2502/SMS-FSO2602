import { zodResolver } from '@hookform/resolvers/zod';
import { type ColumnDef, type ColumnFiltersState } from '@tanstack/react-table';
import {
    keepPreviousData,
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
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
import { fetchAllAcademicYears, fetchSemesters } from '@/features/academic-years/api/academic-years-api';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { fetchHomeroomClasses } from '@/features/homeroom-classes/api/homeroom-classes-api';
import {
    createStudent,
    fetchStudents,
    updateStudentStatus,
    type Student,
} from '@/features/students/api/students-api';
import { StudentsImportExportActions } from '@/features/students/components/students-import-export-actions';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { getApiError } from '@/lib/api';
import { getErrorMessage } from '@/lib/error-messages';
import { selectClassName } from '@/lib/form-styles';
import { ACADEMIC_STATUS_LABELS, GENDER_LABELS } from '@/lib/labels';
import {
    getColumnFilterValue,
    hasColumnFilters,
    setColumnFilterValue,
} from '@/lib/table-filters';
import { cn } from '@/lib/utils';
import type { AcademicEntityStatus } from '@/types/api.types';

const PAGE_SIZE = 20;

const createSchema = z
    .object({
        fullName: z.string().trim().min(1, 'Họ tên là bắt buộc'),
        dateOfBirth: z.string().optional(),
        gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
        phone: z.string().trim().optional(),
        address: z.string().trim().optional(),
        createAccount: z.boolean().optional(),
    })
    .superRefine((values, ctx) => {
        if (values.createAccount && !values.dateOfBirth?.trim()) {
            ctx.addIssue({
                code: 'custom',
                message: 'Ngày sinh là bắt buộc khi tạo tài khoản',
                path: ['dateOfBirth'],
            });
        }
    });

type CreateFormValues = z.infer<typeof createSchema>;

const STATUS_BADGE: Record<AcademicEntityStatus, string> = {
    ACTIVE: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    INACTIVE: 'bg-muted text-muted-foreground',
};

export function StudentsPage() {
    const { session } = useAuth();
    const queryClient = useQueryClient();
    const [globalFilter, setGlobalFilter] = useState('');
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [page, setPage] = useState(1);
    const [showForm, setShowForm] = useState(false);
    const [importOpen, setImportOpen] = useState(false);
    const [filtersReady, setFiltersReady] = useState(false);
    const filtersInitializedRef = useRef(false);
    const debouncedSearch = useDebouncedValue(globalFilter, 300);

    const yearFilter = getColumnFilterValue<string>(
        columnFilters,
        'academicYearId',
    );
    const classFilter = getColumnFilterValue<string>(
        columnFilters,
        'homeroomClassId',
    );
    const semesterFilter = getColumnFilterValue<string>(
        columnFilters,
        'semesterId',
    );
    const statusFilter = getColumnFilterValue<AcademicEntityStatus>(
        columnFilters,
        'status',
    );

    const yearsQuery = useQuery({
        queryKey: ['academic-years', session?.activeSchoolId, 'all'],
        queryFn: fetchAllAcademicYears,
        enabled: Boolean(session?.activeSchoolId),
    });

    const years = yearsQuery.data?.items ?? [];

    useEffect(() => {
        filtersInitializedRef.current = false;
        setFiltersReady(false);
        setColumnFilters([]);
    }, [session?.activeSchoolId]);

    useEffect(() => {
        if (filtersInitializedRef.current || yearsQuery.isLoading) {
            return;
        }

        filtersInitializedRef.current = true;

        if (!years.length) {
            setFiltersReady(true);
            return;
        }

        const defaultYear =
            years.find((year) => year.isCurrent) ?? years[0] ?? null;

        if (defaultYear) {
            setColumnFilters([
                { id: 'academicYearId', value: defaultYear.id },
            ]);
        }

        setFiltersReady(true);
    }, [years, yearsQuery.isLoading]);

    const classesQuery = useQuery({
        queryKey: [
            'homeroom-classes',
            session?.activeSchoolId,
            'students-filter',
            yearFilter,
        ],
        queryFn: () =>
            fetchHomeroomClasses({
                academicYearId: yearFilter,
                status: 'ACTIVE',
                limit: 100,
            }),
        enabled: Boolean(session?.activeSchoolId && yearFilter),
    });

    const semestersQuery = useQuery({
        queryKey: ['semesters', session?.activeSchoolId, 'filter', yearFilter],
        queryFn: () => fetchSemesters(yearFilter!),
        enabled: Boolean(session?.activeSchoolId && yearFilter),
    });

    const semesters = semestersQuery.data ?? [];

    const listQuery = useQuery({
        queryKey: [
            'students',
            session?.activeSchoolId,
            debouncedSearch,
            yearFilter,
            semesterFilter,
            classFilter,
            statusFilter,
            page,
        ],
        queryFn: () =>
            fetchStudents({
                search: debouncedSearch || undefined,
                academicYearId: yearFilter,
                semesterId: semesterFilter,
                homeroomClassId: classFilter,
                status: statusFilter,
                page,
                limit: PAGE_SIZE,
            }),
        enabled: Boolean(session?.activeSchoolId && filtersReady),
        placeholderData: keepPreviousData,
    });

    const {
        register,
        handleSubmit,
        reset,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<CreateFormValues>({
        resolver: zodResolver(createSchema),
        defaultValues: {
            fullName: '',
            dateOfBirth: '',
            gender: undefined,
            phone: '',
            address: '',
            createAccount: false,
        },
    });

    const createAccount = watch('createAccount');

    const createMutation = useMutation({
        mutationFn: createStudent,
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['students'] });
            toast.success('Tạo hồ sơ học sinh thành công');
            reset();
            setShowForm(false);
        },
        onError: (error) => {
            const apiError = getApiError(error);
            toast.error(
                getErrorMessage(
                    apiError?.code,
                    apiError?.message ?? 'Tạo học sinh thất bại',
                ),
            );
        },
    });

    const statusMutation = useMutation({
        mutationFn: ({
            id,
            status,
        }: {
            id: string;
            status: AcademicEntityStatus;
        }) => updateStudentStatus(id, status),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['students'] });
            toast.success('Cập nhật trạng thái thành công');
        },
        onError: (error) => {
            const apiError = getApiError(error);
            toast.error(
                getErrorMessage(
                    apiError?.code,
                    apiError?.message ?? 'Thất bại',
                ),
            );
        },
    });

    const handleToggleStatus = useCallback(
        (id: string, status: AcademicEntityStatus) => {
            statusMutation.mutate({ id, status });
        },
        [statusMutation],
    );

    const columns = useMemo<ColumnDef<Student>[]>(
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
                id: 'email',
                header: 'Email',
                cell: ({ row }) => row.original.userEmail ?? '—',
            },
            {
                id: 'class',
                header: 'Lớp hiện tại',
                cell: ({ row }) =>
                    row.original.currentEnrollment
                        ? `${row.original.currentEnrollment.homeroomClassCode} (${row.original.currentEnrollment.academicYearName})`
                        : '—',
            },
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
            {
                id: 'actions',
                header: () => <span className='sr-only'>Thao tác</span>,
                cell: ({ row }) => (
                    <div className='flex gap-2'>
                        <Button
                            variant='outline'
                            size='sm'
                            render={
                                <Link
                                    to={`${ROUTES.students}/${row.original.id}`}
                                />
                            }
                        >
                            Chi tiết
                        </Button>
                        <Button
                            variant='outline'
                            size='sm'
                            disabled={statusMutation.isPending}
                            onClick={() =>
                                handleToggleStatus(
                                    row.original.id,
                                    row.original.status === 'ACTIVE'
                                        ? 'INACTIVE'
                                        : 'ACTIVE',
                                )
                            }
                        >
                            {row.original.status === 'ACTIVE'
                                ? 'Ngưng'
                                : 'Kích hoạt'}
                        </Button>
                    </div>
                ),
            },
        ],
        [handleToggleStatus, statusMutation.isPending],
    );

    const items = listQuery.data?.items ?? [];
    const filtersActive = hasColumnFilters(columnFilters, globalFilter);
    // Chỉ lấy lớp HC của năm đã chọn (không lẫn lớp năm khác / cache cũ)
    const classes = yearFilter
        ? (classesQuery.data?.items ?? []).filter(
              (row) => row.academicYearId === yearFilter,
          )
        : [];

    useEffect(() => {
        if (!classFilter) {
            return;
        }
        if (!yearFilter) {
            setColumnFilters((prev) =>
                setColumnFilterValue(prev, 'homeroomClassId', undefined),
            );
            return;
        }
        if (classesQuery.isFetching || classesQuery.isLoading) {
            return;
        }
        const belongsToYear = classes.some((row) => row.id === classFilter);
        if (!belongsToYear) {
            setColumnFilters((prev) =>
                setColumnFilterValue(prev, 'homeroomClassId', undefined),
            );
        }
    }, [
        yearFilter,
        classFilter,
        classes,
        classesQuery.isFetching,
        classesQuery.isLoading,
    ]);

    return (
        <div className='space-y-6'>
            <div className='flex flex-wrap items-center justify-between gap-4'>
                <div>
                    <h1 className='text-2xl font-semibold'>Học sinh</h1>
                    <p className='text-sm text-muted-foreground'>
                        Quản lý hồ sơ và ghi danh học sinh
                    </p>
                </div>
                <Button onClick={() => setShowForm((v) => !v)}>
                    {showForm ? 'Đóng form' : 'Thêm học sinh'}
                </Button>
            </div>

            {showForm ? (
                <Card>
                    <CardHeader>
                        <CardTitle>Tạo hồ sơ học sinh</CardTitle>
                        <CardDescription>
                            Có thể tạo kèm tài khoản đăng nhập hoặc chỉ hồ sơ
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form
                            className='grid gap-4 md:grid-cols-2'
                            onSubmit={handleSubmit((values) =>
                                createMutation.mutate({
                                    fullName: values.fullName,
                                    dateOfBirth:
                                        values.dateOfBirth || undefined,
                                    gender: values.gender,
                                    phone: values.phone || undefined,
                                    address: values.address || undefined,
                                    ...(values.createAccount
                                        ? { createLogin: true }
                                        : {}),
                                }),
                            )}
                        >
                            <div className='space-y-2 md:col-span-2'>
                                <Label htmlFor='fullName'>Họ tên</Label>
                                <Input
                                    id='fullName'
                                    {...register('fullName')}
                                />
                                {errors.fullName ? (
                                    <p className='text-sm text-destructive'>
                                        {errors.fullName.message}
                                    </p>
                                ) : null}
                            </div>
                            <div className='space-y-2'>
                                <Label htmlFor='dateOfBirth'>Ngày sinh</Label>
                                <Input
                                    id='dateOfBirth'
                                    type='date'
                                    {...register('dateOfBirth')}
                                />
                                {errors.dateOfBirth ? (
                                    <p className='text-sm text-destructive'>
                                        {errors.dateOfBirth.message}
                                    </p>
                                ) : null}
                            </div>
                            <div className='space-y-2'>
                                <Label htmlFor='gender'>Giới tính</Label>
                                <select
                                    id='gender'
                                    className={selectClassName}
                                    {...register('gender')}
                                >
                                    <option value=''>Chưa chọn</option>
                                    {(
                                        Object.keys(GENDER_LABELS) as Array<
                                            keyof typeof GENDER_LABELS
                                        >
                                    ).map((gender) => (
                                        <option key={gender} value={gender}>
                                            {GENDER_LABELS[gender]}
                                        </option>
                                    ))}
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
                            <div className='space-y-2 md:col-span-2'>
                                <div className='flex items-center gap-2'>
                                    <input
                                        id='createAccount'
                                        type='checkbox'
                                        {...register('createAccount')}
                                    />
                                    <Label htmlFor='createAccount'>
                                        Tạo tài khoản đăng nhập
                                    </Label>
                                </div>
                                {createAccount ? (
                                    <p className='text-sm text-muted-foreground'>
                                        Đăng nhập bằng mã HS vừa cấp. Mật khẩu
                                        mặc định: mã HS + ngày sinh (YYYYMMDD).
                                    </p>
                                ) : null}
                            </div>
                            <div className='md:col-span-2'>
                                <Button type='submit' disabled={isSubmitting}>
                                    {isSubmitting
                                        ? 'Đang tạo...'
                                        : 'Tạo học sinh'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            ) : null}

            <Card>
                <CardHeader className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
                    <div>
                        <CardTitle>Danh sách học sinh</CardTitle>
                        <CardDescription>
                            Bộ lọc áp dụng cho danh sách và export file
                        </CardDescription>
                    </div>
                    <StudentsImportExportActions
                        exportFilters={{
                            search: debouncedSearch || undefined,
                            academicYearId: yearFilter,
                            semesterId: semesterFilter,
                            homeroomClassId: classFilter,
                            status: statusFilter,
                        }}
                        importOpen={importOpen}
                        onImportOpenChange={setImportOpen}
                        onImportSuccess={() => {
                            void queryClient.invalidateQueries({
                                queryKey: ['students'],
                            });
                        }}
                    />
                </CardHeader>
                <CardContent className='space-y-4'>
                    <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-5'>
                        <div className='space-y-1.5'>
                            <Label htmlFor='stu-search'>Tìm kiếm</Label>
                            <Input
                                id='stu-search'
                                placeholder='Tên hoặc email...'
                                value={globalFilter}
                                onChange={(e) => {
                                    setGlobalFilter(e.target.value);
                                    setPage(1);
                                }}
                            />
                        </div>
                        <div className='space-y-1.5'>
                            <Label htmlFor='stu-year'>Năm học</Label>
                            <select
                                id='stu-year'
                                className={selectClassName}
                                value={yearFilter ?? ''}
                                onChange={(e) => {
                                    setColumnFilters((prev) => {
                                        const next = setColumnFilterValue(
                                            prev,
                                            'academicYearId',
                                            e.target.value || undefined,
                                        );
                                        return setColumnFilterValue(
                                            setColumnFilterValue(
                                                next,
                                                'homeroomClassId',
                                                undefined,
                                            ),
                                            'semesterId',
                                            undefined,
                                        );
                                    });
                                    setPage(1);
                                }}
                            >
                                <option value=''>Tất cả</option>
                                {years.map((y) => (
                                    <option key={y.id} value={y.id}>
                                        {y.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className='space-y-1.5'>
                            <Label htmlFor='stu-semester'>Học kỳ</Label>
                            <select
                                id='stu-semester'
                                className={selectClassName}
                                value={yearFilter ? (semesterFilter ?? '') : ''}
                                disabled={!yearFilter}
                                onChange={(e) => {
                                    setColumnFilters((prev) =>
                                        setColumnFilterValue(
                                            prev,
                                            'semesterId',
                                            e.target.value || undefined,
                                        ),
                                    );
                                    setPage(1);
                                }}
                            >
                                <option value=''>
                                    {yearFilter
                                        ? 'Tất cả'
                                        : 'Chọn năm học trước'}
                                </option>
                                {semesters.map((semester) => (
                                    <option key={semester.id} value={semester.id}>
                                        {semester.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className='space-y-1.5'>
                            <Label htmlFor='stu-class'>Lớp HC</Label>
                            <select
                                id='stu-class'
                                className={selectClassName}
                                value={yearFilter ? (classFilter ?? '') : ''}
                                disabled={!yearFilter}
                                onChange={(e) => {
                                    setColumnFilters((prev) =>
                                        setColumnFilterValue(
                                            prev,
                                            'homeroomClassId',
                                            e.target.value || undefined,
                                        ),
                                    );
                                    setPage(1);
                                }}
                            >
                                <option value=''>
                                    {yearFilter
                                        ? 'Tất cả'
                                        : 'Chọn năm học trước'}
                                </option>
                                {classes.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.code}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className='space-y-1.5'>
                            <Label htmlFor='stu-status'>Trạng thái</Label>
                            <select
                                id='stu-status'
                                className={selectClassName}
                                value={statusFilter ?? ''}
                                onChange={(e) => {
                                    setColumnFilters(
                                        setColumnFilterValue(
                                            columnFilters,
                                            'status',
                                            e.target.value || undefined,
                                        ),
                                    );
                                    setPage(1);
                                }}
                            >
                                <option value=''>Tất cả</option>
                                {(
                                    Object.keys(
                                        ACADEMIC_STATUS_LABELS,
                                    ) as AcademicEntityStatus[]
                                ).map((status) => (
                                    <option key={status} value={status}>
                                        {ACADEMIC_STATUS_LABELS[status]}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {listQuery.isError ? (
                        <ErrorState
                            message='Không tải được danh sách học sinh'
                            onRetry={() => void listQuery.refetch()}
                        />
                    ) : null}

                    <div className='relative rounded-lg border border-border'>
                        {listQuery.isFetching && !listQuery.isLoading ? (
                            <div className='absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/60 backdrop-blur-[1px]'>
                                <LoadingState message='Đang tải dữ liệu...' />
                            </div>
                        ) : null}

                        {listQuery.isLoading || !filtersReady ? (
                            <LoadingState message='Đang tải danh sách...' />
                        ) : !filtersActive && items.length === 0 ? (
                            <EmptyState
                                title='Chưa có học sinh'
                                description='Tạo hồ sơ học sinh đầu tiên'
                            />
                        ) : (
                            <DataTableGrid data={items} columns={columns} />
                        )}
                    </div>

                    {!listQuery.isLoading &&
                    filtersReady &&
                    (items.length > 0 || filtersActive) ? (
                        <DataPagination
                            page={listQuery.data?.meta.page ?? page}
                            totalPages={listQuery.data?.meta.totalPages ?? 1}
                            onPageChange={setPage}
                        />
                    ) : null}
                </CardContent>
            </Card>
        </div>
    );
}
