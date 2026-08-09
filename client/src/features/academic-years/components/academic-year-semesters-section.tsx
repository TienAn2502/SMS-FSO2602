import { zodResolver } from '@hookform/resolvers/zod';
import { type ColumnDef } from '@tanstack/react-table';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { toast } from 'sonner';

import { ROUTES } from '@/app/router/routes';
import { DataTableGrid } from '@/components/common/data-table-grid';
import { EmptyState } from '@/components/feedback/empty-state';
import { LoadingState } from '@/components/feedback/loading-state';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/hooks/use-auth';
import {
    createSemester,
    fetchSemesters,
    setSemesterCurrent,
    updateSemesterStatus,
    type Semester,
} from '@/features/academic-years/api/academic-years-api';
import { SemesterEditForm } from '@/features/academic-years/components/semester-edit-form';
import { SemesterPreparationPanel } from '@/features/academic-years/components/semester-preparation-panel';
import { getApiError } from '@/lib/api';
import { formatDateRangeVi } from '@/lib/date-format';
import { getErrorMessage } from '@/lib/error-messages';
import { ACADEMIC_STATUS_LABELS } from '@/lib/labels';
import {
    createSemesterFormSchema,
    type SemesterFormValues,
} from '@/lib/semester-form-schema';
import { cn } from '@/lib/utils';
import type { AcademicEntityStatus } from '@/types/api.types';

const MAX_SEMESTERS_PER_ACADEMIC_YEAR = 2;

const STATUS_BADGE: Record<AcademicEntityStatus, string> = {
    ACTIVE: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    INACTIVE: 'bg-muted text-muted-foreground',
};

interface AcademicYearSemestersSectionProps {
    yearId: string;
    yearName: string;
    yearStartDate: string;
    yearEndDate: string;
    yearIsCurrent: boolean;
}

export function AcademicYearSemestersSection({
    yearId,
    yearName,
    yearStartDate,
    yearEndDate,
    yearIsCurrent,
}: AcademicYearSemestersSectionProps) {
    const { session } = useAuth();
    const queryClient = useQueryClient();
    const [showSemesterForm, setShowSemesterForm] = useState(false);
    const [editingSemester, setEditingSemester] = useState<Semester | null>(
        null,
    );

    const semestersQuery = useQuery({
        queryKey: ['semesters', session?.activeSchoolId, yearId],
        queryFn: () => fetchSemesters(yearId),
        enabled: Boolean(session?.activeSchoolId && yearId),
    });

    const semesterFormSchema = useMemo(
        () => createSemesterFormSchema(yearStartDate, yearEndDate),
        [yearStartDate, yearEndDate],
    );

    const semesterForm = useForm<SemesterFormValues>({
        resolver: zodResolver(semesterFormSchema),
        defaultValues: {
            name: '',
            code: '',
            startDate: '',
            endDate: '',
        },
    });

    const invalidateSemesters = () => {
        void queryClient.invalidateQueries({ queryKey: ['semesters'] });
        void queryClient.invalidateQueries({ queryKey: ['academic-years'] });
    };

    const createSemesterMutation = useMutation({
        mutationFn: (values: SemesterFormValues) =>
            createSemester(yearId, values),
        onSuccess: () => {
            invalidateSemesters();
            toast.success('Tạo học kỳ thành công');
            semesterForm.reset();
            setShowSemesterForm(false);
        },
        onError: (error) => {
            const apiError = getApiError(error);
            toast.error(
                getErrorMessage(
                    apiError?.code,
                    apiError?.message ?? 'Tạo học kỳ thất bại',
                ),
            );
        },
    });

    const setSemesterCurrentMutation = useMutation({
        mutationFn: (semesterId: string) => setSemesterCurrent(yearId, semesterId),
        onSuccess: () => {
            invalidateSemesters();
            void queryClient.invalidateQueries({
                queryKey: ['student-enrollments'],
            });
            toast.success(
                'Đặt học kỳ hiện hành thành công — ghi danh học kỳ cũ đã được đóng',
            );
        },
        onError: (error) => {
            const apiError = getApiError(error);
            toast.error(
                getErrorMessage(apiError?.code, apiError?.message ?? 'Thất bại'),
            );
        },
    });

    const semesterStatusMutation = useMutation({
        mutationFn: ({
            id,
            status,
        }: {
            id: string;
            status: AcademicEntityStatus;
        }) => updateSemesterStatus(yearId, id, status),
        onSuccess: () => {
            invalidateSemesters();
            toast.success('Cập nhật trạng thái học kỳ thành công');
        },
        onError: (error) => {
            const apiError = getApiError(error);
            toast.error(
                getErrorMessage(apiError?.code, apiError?.message ?? 'Thất bại'),
            );
        },
    });

    const semesterColumns = useMemo<ColumnDef<Semester>[]>(
        () => [
            {
                accessorKey: 'name',
                header: 'Tên học kỳ',
                cell: ({ row }) => (
                    <Link
                        to={`${ROUTES.academicYears}/${yearId}/semesters/${row.original.id}`}
                        className='font-medium hover:underline'
                    >
                        {row.original.name}
                    </Link>
                ),
            },
            { accessorKey: 'code', header: 'Mã' },
            {
                id: 'dates',
                header: 'Thời gian',
                cell: ({ row }) =>
                    formatDateRangeVi(
                        row.original.startDate,
                        row.original.endDate,
                    ),
            },
            {
                accessorKey: 'isCurrent',
                header: 'Hiện hành',
                cell: ({ row }) =>
                    row.original.isCurrent ? (
                        <span className='rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary'>
                            HK hiện tại
                        </span>
                    ) : (
                        <span className='text-xs text-muted-foreground'>—</span>
                    ),
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
                cell: ({ row }) => {
                    const semester = row.original;
                    return (
                        <div className='flex flex-wrap gap-2'>
                            <Button
                                variant='outline'
                                size='sm'
                                onClick={() => {
                                    setShowSemesterForm(false);
                                    setEditingSemester(semester);
                                }}
                            >
                                Chỉnh sửa
                            </Button>
                            {!semester.isCurrent ? (
                                <Button
                                    variant='outline'
                                    size='sm'
                                    disabled={
                                        setSemesterCurrentMutation.isPending
                                    }
                                    onClick={() =>
                                        setSemesterCurrentMutation.mutate(
                                            semester.id,
                                        )
                                    }
                                >
                                    Đặt hiện hành
                                </Button>
                            ) : null}
                            <Button
                                variant='outline'
                                size='sm'
                                disabled={semesterStatusMutation.isPending}
                                onClick={() =>
                                    semesterStatusMutation.mutate({
                                        id: semester.id,
                                        status:
                                            semester.status === 'ACTIVE'
                                                ? 'INACTIVE'
                                                : 'ACTIVE',
                                    })
                                }
                            >
                                {semester.status === 'ACTIVE'
                                    ? 'Ngưng'
                                    : 'Kích hoạt'}
                            </Button>
                        </div>
                    );
                },
            },
        ],
        [
            yearId,
            semesterStatusMutation,
            setSemesterCurrentMutation,
        ],
    );

    const semesters = semestersQuery.data ?? [];
    const semesterLimitReached =
        semesters.length >= MAX_SEMESTERS_PER_ACADEMIC_YEAR;

    const hkEnrollmentCopy = useMemo(() => {
        const hk1 = semesters.find((semester) => semester.code === 'HK1');
        const hk2 = semesters.find((semester) => semester.code === 'HK2');
        if (!hk1 || !hk2) {
            return null;
        }
        return { source: hk1, target: hk2 };
    }, [semesters]);

    useEffect(() => {
        if (semesterLimitReached && showSemesterForm) {
            setShowSemesterForm(false);
        }
    }, [semesterLimitReached, showSemesterForm]);

    return (
        <Card>
            <CardHeader className='flex flex-row flex-wrap items-center justify-between gap-4'>
                <div>
                    <CardTitle>Học kỳ — {yearName}</CardTitle>
                    <CardDescription>
                        Quản lý học kỳ trong năm học đã chọn
                    </CardDescription>
                </div>
                {semesterLimitReached && !showSemesterForm ? (
                    <span
                        title='Năm học này đã có đủ 2 học kỳ'
                        className='inline-flex cursor-not-allowed'
                    >
                        <Button disabled>Thêm học kỳ</Button>
                    </span>
                ) : (
                    <Button onClick={() => {
                        setEditingSemester(null);
                        setShowSemesterForm((v) => !v);
                    }}>
                        {showSemesterForm ? 'Đóng form' : 'Thêm học kỳ'}
                    </Button>
                )}
            </CardHeader>
            <CardContent className='space-y-4'>
                {showSemesterForm ? (
                    <form
                        className='grid gap-4 rounded-lg border border-border p-4 md:grid-cols-2'
                        onSubmit={semesterForm.handleSubmit((values) =>
                            createSemesterMutation.mutate(values),
                        )}
                    >
                        <div className='md:col-span-2'>
                            <p className='text-xs text-muted-foreground'>
                                Trong phạm vi năm học: {yearStartDate} →{' '}
                                {yearEndDate}
                            </p>
                        </div>
                        <div className='space-y-2'>
                            <Label htmlFor='sem-name'>Tên học kỳ</Label>
                            <Input
                                id='sem-name'
                                {...semesterForm.register('name')}
                                placeholder='Học kỳ 1'
                            />
                        </div>
                        <div className='space-y-2'>
                            <Label htmlFor='sem-code'>Mã</Label>
                            <Input
                                id='sem-code'
                                {...semesterForm.register('code')}
                                placeholder='HK1'
                            />
                        </div>
                        <div className='space-y-2'>
                            <Label htmlFor='sem-start'>Ngày bắt đầu</Label>
                            <Input
                                id='sem-start'
                                type='date'
                                min={yearStartDate}
                                max={yearEndDate}
                                {...semesterForm.register('startDate')}
                            />
                            {semesterForm.formState.errors.startDate ? (
                                <p className='text-xs text-destructive'>
                                    {
                                        semesterForm.formState.errors.startDate
                                            .message
                                    }
                                </p>
                            ) : null}
                        </div>
                        <div className='space-y-2'>
                            <Label htmlFor='sem-end'>Ngày kết thúc</Label>
                            <Input
                                id='sem-end'
                                type='date'
                                min={yearStartDate}
                                max={yearEndDate}
                                {...semesterForm.register('endDate')}
                            />
                            {semesterForm.formState.errors.endDate ? (
                                <p className='text-xs text-destructive'>
                                    {
                                        semesterForm.formState.errors.endDate
                                            .message
                                    }
                                </p>
                            ) : null}
                        </div>
                        <div className='md:col-span-2'>
                            <Button
                                type='submit'
                                disabled={createSemesterMutation.isPending}
                            >
                                {createSemesterMutation.isPending
                                    ? 'Đang tạo...'
                                    : 'Tạo học kỳ'}
                            </Button>
                        </div>
                    </form>
                ) : null}

                {editingSemester ? (
                    <SemesterEditForm
                        yearId={yearId}
                        semester={editingSemester}
                        academicYearStartDate={yearStartDate}
                        academicYearEndDate={yearEndDate}
                        onSuccess={() => {
                            invalidateSemesters();
                            setEditingSemester(null);
                        }}
                        onCancel={() => setEditingSemester(null)}
                    />
                ) : null}

                {semestersQuery.isLoading ? (
                    <LoadingState message='Đang tải học kỳ...' />
                ) : semesters.length === 0 ? (
                    <EmptyState
                        title='Chưa có học kỳ'
                        description='Thêm học kỳ cho năm học này'
                    />
                ) : (
                    <DataTableGrid data={semesters} columns={semesterColumns} />
                )}

                {hkEnrollmentCopy ? (
                    <SemesterPreparationPanel
                        yearId={yearId}
                        yearIsCurrent={yearIsCurrent}
                        source={hkEnrollmentCopy.source}
                        target={hkEnrollmentCopy.target}
                    />
                ) : null}
            </CardContent>
        </Card>
    );
}
