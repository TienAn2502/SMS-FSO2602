import { zodResolver } from '@hookform/resolvers/zod';
import { type ColumnDef } from '@tanstack/react-table';
import {
    keepPreviousData,
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { fetchSemesters } from '@/features/academic-years/api/academic-years-api';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { CourseSectionListFilters } from '@/features/course-sections/components/course-section-list-filters';
import { CourseSectionsImportSheet } from '@/features/course-sections/components/course-sections-import-sheet';
import {
    findCurrentAcademicContext,
    useCourseSectionListFilters,
} from '@/features/course-sections/hooks/use-course-section-list-filters';
import { fetchAllGradeLevels } from '@/features/grade-levels/api/grade-levels-api';
import {
    createCourseSection,
    fetchCourseSections,
    updateCourseSectionStatus,
    type CourseSection,
} from '@/features/course-sections/api/course-sections-api';
import { fetchHomeroomClasses } from '@/features/homeroom-classes/api/homeroom-classes-api';
import { getApiError } from '@/lib/api';
import { getErrorMessage } from '@/lib/error-messages';
import { selectClassName } from '@/lib/form-styles';
import { ACADEMIC_STATUS_LABELS } from '@/lib/labels';
import { cn } from '@/lib/utils';
import type { AcademicEntityStatus } from '@/types/api.types';

const PAGE_SIZE = 20;

const createSchema = z
    .object({
        academicYearId: z.string().uuid('Chọn năm học'),
        semesterId: z.string().uuid('Chọn học kỳ'),
        subjectId: z.string().uuid('Chọn môn học'),
        homeroomClassId: z.string().optional(),
        gradeLevelId: z.string().optional(),
        name: z.string().trim().min(1, 'Tên lớp môn là bắt buộc'),
        code: z.string().trim().min(1, 'Mã lớp môn là bắt buộc'),
    })
    .superRefine((value, ctx) => {
        if (!value.homeroomClassId && !value.gradeLevelId) {
            ctx.addIssue({
                code: 'custom',
                message: 'Chọn lớp HC hoặc khối',
                path: ['gradeLevelId'],
            });
        }
    });

type CreateFormValues = z.infer<typeof createSchema>;

const STATUS_BADGE: Record<AcademicEntityStatus, string> = {
    ACTIVE: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    INACTIVE: 'bg-muted text-muted-foreground',
};

export function CourseSectionsPage() {
    const { session } = useAuth();
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [showForm, setShowForm] = useState(false);
    const [importOpen, setImportOpen] = useState(false);

    const filters = useCourseSectionListFilters(() => setPage(1));
    const {
        globalFilter,
        debouncedSearch,
        yearFilter,
        semesterFilter,
        subjectFilter,
        statusFilter,
        filtersReady,
        filtersActive,
        years,
        subjects,
        filterSemesters,
        semesterMap,
        semestersByYearId,
        setGlobalFilter,
        setYearFilter,
        setSemesterFilter,
        setSubjectFilter,
        setStatusFilter,
    } = filters;

    const gradesQuery = useQuery({
        queryKey: ['grade-levels', session?.activeSchoolId, 'all'],
        queryFn: fetchAllGradeLevels,
        enabled: Boolean(session?.activeSchoolId),
    });

    const listQuery = useQuery({
        queryKey: [
            'course-sections',
            session?.activeSchoolId,
            debouncedSearch,
            yearFilter,
            semesterFilter,
            subjectFilter,
            statusFilter,
            page,
        ],
        queryFn: () =>
            fetchCourseSections({
                search: debouncedSearch || undefined,
                academicYearId: yearFilter,
                semesterId: semesterFilter,
                subjectId: subjectFilter,
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
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<CreateFormValues>({
        resolver: zodResolver(createSchema),
        defaultValues: {
            academicYearId: '',
            semesterId: '',
            subjectId: '',
            homeroomClassId: '',
            gradeLevelId: '',
            name: '',
            code: '',
        },
    });

    const formYearId = watch('academicYearId');
    const formHomeroomClassId = watch('homeroomClassId');
    const formSubjectId = watch('subjectId');

    const formSemestersQuery = useQuery({
        queryKey: ['semesters', session?.activeSchoolId, 'form', formYearId],
        queryFn: () => fetchSemesters(formYearId),
        enabled: Boolean(session?.activeSchoolId && formYearId),
    });

    const homeroomClassesQuery = useQuery({
        queryKey: [
            'homeroom-classes',
            session?.activeSchoolId,
            'form',
            formYearId,
        ],
        queryFn: () =>
            fetchHomeroomClasses({
                academicYearId: formYearId,
                limit: 100,
                page: 1,
                status: 'ACTIVE',
            }),
        enabled: Boolean(session?.activeSchoolId && formYearId),
    });

    const createMutation = useMutation({
        mutationFn: createCourseSection,
        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: ['course-sections'],
            });
            toast.success('Tạo lớp môn học thành công');
            reset();
            setShowForm(false);
        },
        onError: (error) => {
            const apiError = getApiError(error);
            toast.error(
                getErrorMessage(
                    apiError?.code,
                    apiError?.message ?? 'Tạo lớp môn thất bại',
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
        }) => updateCourseSectionStatus(id, status),
        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: ['course-sections'],
            });
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

    const handleToggleForm = useCallback(() => {
        setShowForm((prev) => {
            if (!prev) {
                const currentContext = findCurrentAcademicContext(
                    years,
                    semestersByYearId,
                );
                reset({
                    academicYearId: currentContext?.currentYear.id ?? '',
                    semesterId: currentContext?.currentSemester?.id ?? '',
                    subjectId: '',
                    homeroomClassId: '',
                    gradeLevelId: '',
                    name: '',
                    code: '',
                });
            }
            return !prev;
        });
    }, [years, semestersByYearId, reset]);

    const columns = useMemo<ColumnDef<CourseSection>[]>(
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
                id: 'semester',
                header: 'Học kỳ',
                cell: ({ row }) =>
                    semesterMap.get(row.original.semesterId)?.name ?? '—',
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
                    <div className='flex flex-wrap gap-2'>
                        <Button
                            variant='outline'
                            size='sm'
                            render={
                                <Link
                                    to={`${ROUTES.courseSections}/${row.original.id}`}
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
        [handleToggleStatus, semesterMap, statusMutation.isPending],
    );

    const items = listQuery.data?.items ?? [];
    const grades = gradesQuery.data?.items ?? [];
    const homeroomClasses = homeroomClassesQuery.data?.items ?? [];
    const formSemesters = formSemestersQuery.data ?? [];

    useEffect(() => {
        const subject = subjects.find((row) => row.id === formSubjectId);
        const homeroom = homeroomClasses.find(
            (row) => row.id === formHomeroomClassId,
        );
        if (!subject || !homeroom) {
            return;
        }

        setValue('code', `${subject.code}-${homeroom.code}`.slice(0, 30), {
            shouldDirty: true,
        });
        setValue('name', `${subject.name} ${homeroom.code}`.slice(0, 100), {
            shouldDirty: true,
        });
    }, [
        formSubjectId,
        formHomeroomClassId,
        subjects,
        homeroomClasses,
        setValue,
    ]);

    return (
        <div className='space-y-6'>
            <div className='flex flex-wrap items-center justify-between gap-4'>
                <div>
                    <h1 className='text-2xl font-semibold'>Lớp môn học</h1>
                    <p className='text-sm text-muted-foreground'>
                        Tạo tay hoặc import Excel (mỗi sheet một lớp HC). Chọn
                        học kỳ rồi tải mẫu: khối 10 tạo mới theo cấu hình môn;
                        khối 11/12 lấy môn từ HK2 năm trước trong DB.
                    </p>
                </div>
                <div className='flex flex-wrap gap-2'>
                    <Button
                        type='button'
                        variant='outline'
                        onClick={() => setImportOpen(true)}
                    >
                        Import Excel
                    </Button>
                    <Button onClick={handleToggleForm}>
                        {showForm ? 'Đóng form' : 'Thêm lớp môn'}
                    </Button>
                </div>
            </div>

            <CourseSectionsImportSheet
                open={importOpen}
                onOpenChange={setImportOpen}
                defaultAcademicYearId={
                    yearFilter && yearFilter !== 'all' ? yearFilter : formYearId || ''
                }
                defaultSemesterId={
                    semesterFilter && semesterFilter !== 'all'
                        ? semesterFilter
                        : ''
                }
                onSuccess={() => {
                    void queryClient.invalidateQueries({
                        queryKey: ['course-sections'],
                    });
                    void queryClient.invalidateQueries({
                        queryKey: ['teaching-assignments'],
                    });
                }}
            />

            {showForm ? (
                <Card>
                    <CardHeader>
                        <CardTitle>Tạo lớp môn học</CardTitle>
                        <CardDescription>
                            Chọn năm/học kỳ/môn và lớp HC (hoặc khối cho lớp
                            ghép). Mã/tên tự gợi ý khi chọn môn + lớp HC. Có thể
                            import Excel nhiều lớp cùng lúc.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form
                            className='grid gap-4 md:grid-cols-2'
                            onSubmit={handleSubmit((values) =>
                                createMutation.mutate({
                                    semesterId: values.semesterId,
                                    subjectId: values.subjectId,
                                    name: values.name,
                                    code: values.code,
                                    homeroomClassId:
                                        values.homeroomClassId || null,
                                    gradeLevelId: values.homeroomClassId
                                        ? undefined
                                        : values.gradeLevelId,
                                }),
                            )}
                        >
                            <div className='space-y-2'>
                                <Label htmlFor='cs-year'>Năm học</Label>
                                <select
                                    id='cs-year'
                                    className={selectClassName}
                                    {...register('academicYearId', {
                                        onChange: () => {
                                            reset((values) => ({
                                                ...values,
                                                semesterId: '',
                                                homeroomClassId: '',
                                            }));
                                        },
                                    })}
                                >
                                    <option value=''>Chọn năm học</option>
                                    {years.map((y) => (
                                        <option key={y.id} value={y.id}>
                                            {y.name}
                                            {y.isCurrent ? ' (hiện tại)' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className='space-y-2'>
                                <Label htmlFor='cs-semester'>Học kỳ</Label>
                                <select
                                    id='cs-semester'
                                    className={selectClassName}
                                    disabled={!formYearId}
                                    {...register('semesterId')}
                                >
                                    <option value=''>Chọn học kỳ</option>
                                    {formSemesters.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.name}
                                            {s.isCurrent ? ' (hiện tại)' : ''}
                                        </option>
                                    ))}
                                </select>
                                {errors.semesterId ? (
                                    <p className='text-sm text-destructive'>
                                        {errors.semesterId.message}
                                    </p>
                                ) : null}
                            </div>
                            <div className='space-y-2'>
                                <Label htmlFor='cs-subject'>Môn học</Label>
                                <select
                                    id='cs-subject'
                                    className={selectClassName}
                                    {...register('subjectId')}
                                >
                                    <option value=''>Chọn môn</option>
                                    {subjects.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className='space-y-2'>
                                <Label htmlFor='cs-hc'>
                                    Lớp hành chính (tuỳ chọn)
                                </Label>
                                <select
                                    id='cs-hc'
                                    className={selectClassName}
                                    disabled={!formYearId}
                                    {...register('homeroomClassId')}
                                >
                                    <option value=''>
                                        Không gắn / lớp ghép
                                    </option>
                                    {homeroomClasses.map((hc) => (
                                        <option key={hc.id} value={hc.id}>
                                            {hc.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {!formHomeroomClassId ? (
                                <div className='space-y-2'>
                                    <Label htmlFor='cs-grade'>
                                        Khối (khi không gắn lớp HC)
                                    </Label>
                                    <select
                                        id='cs-grade'
                                        className={selectClassName}
                                        {...register('gradeLevelId')}
                                    >
                                        <option value=''>Chọn khối</option>
                                        {grades.map((g) => (
                                            <option key={g.id} value={g.id}>
                                                {g.name}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.gradeLevelId ? (
                                        <p className='text-sm text-destructive'>
                                            {errors.gradeLevelId.message}
                                        </p>
                                    ) : null}
                                </div>
                            ) : null}
                            <div className='space-y-2'>
                                <Label htmlFor='cs-code'>Mã lớp môn</Label>
                                <Input
                                    id='cs-code'
                                    {...register('code')}
                                    placeholder='TOAN-10A1'
                                />
                            </div>
                            <div className='space-y-2'>
                                <Label htmlFor='cs-name'>Tên lớp môn</Label>
                                <Input
                                    id='cs-name'
                                    {...register('name')}
                                    placeholder='Toán 10A1'
                                />
                            </div>
                            <div className='md:col-span-2'>
                                <Button type='submit' disabled={isSubmitting}>
                                    {isSubmitting
                                        ? 'Đang tạo...'
                                        : 'Tạo lớp môn học'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            ) : null}

            <Card>
                <CardHeader>
                    <CardTitle>Danh sách lớp môn học</CardTitle>
                </CardHeader>
                <CardContent className='space-y-4'>
                    <CourseSectionListFilters
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

                    {listQuery.isError ? (
                        <ErrorState
                            message='Không tải được danh sách lớp môn học'
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
                                title='Chưa có lớp môn học'
                                description='Tạo lớp môn học đầu tiên'
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
