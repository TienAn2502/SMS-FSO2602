import { zodResolver } from '@hookform/resolvers/zod';
import { type ColumnDef } from '@tanstack/react-table';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
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
import {
    fetchAllAcademicYears,
    fetchSemesters,
} from '@/features/academic-years/api/academic-years-api';
import { useAuth } from '@/features/auth/hooks/use-auth';
import {
    fetchCourseSection,
    fetchCourseSectionTimetableEntries,
    updateCourseSection,
    updateCourseSectionStatus,
} from '@/features/course-sections/api/course-sections-api';
import { fetchHomeroomClasses } from '@/features/homeroom-classes/api/homeroom-classes-api';
import { fetchGradeLevelSubject } from '@/features/grade-level-subjects/api/grade-level-subjects-api';
import { fetchAllTeachers } from '@/features/teachers/api/teachers-api';
import {
    createTeachingAssignment,
    fetchTeachingAssignments,
    updateTeachingAssignmentStatus,
    type TeachingAssignment,
} from '@/features/teaching-assignments/api/teaching-assignments-api';
import {
    ChangeCourseSectionTeacherForm,
    CurrentTeacherSummary,
    type ChangeCourseSectionTeacherFormValues,
} from '@/features/course-sections/components/change-course-section-teacher-form';
import { TimetableEntryList } from '@/features/timetable/components/timetable-entry-list';
import {
    fetchTimetableEntries,
    updateTimetableEntry,
} from '@/features/timetable/api/timetable-entries-api';
import { formatDateTimeVi, formatDateVi } from '@/lib/date-format';
import { getApiError } from '@/lib/api';
import { getErrorMessage } from '@/lib/error-messages';
import { selectClassName } from '@/lib/form-styles';
import { ACADEMIC_STATUS_LABELS } from '@/lib/labels';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types/api.types';

const editSchema = z.object({
    name: z.string().trim().min(1, 'Tên lớp môn là bắt buộc'),
    code: z.string().trim().min(1, 'Mã lớp môn là bắt buộc'),
    homeroomClassId: z.string().optional(),
});

type EditFormValues = z.infer<typeof editSchema>;

const STATUS_BADGE = {
    ACTIVE: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    INACTIVE: 'bg-muted text-muted-foreground',
} as const;

function getBackNavigation(role: UserRole | undefined) {
    switch (role) {
        case 'SCHOOL_ADMIN':
            return {
                to: ROUTES.courseSections,
                label: '← Danh sách lớp môn học',
            };
        case 'STUDENT':
            return {
                to: ROUTES.portalMyCourseSections,
                label: '← Lớp môn học của tôi',
            };
        default:
            return {
                to: ROUTES.portal,
                label: '← Portal',
            };
    }
}

async function changeCourseSectionTeacher(input: {
    courseSectionId: string;
    semesterId: string;
    activeAssignmentId: string | null;
    newTeacherId: string;
    assignAt: string;
}) {
    if (input.activeAssignmentId) {
        // Gọi API để cập nhật và đóng assignment hiện tại
        await updateTeachingAssignmentStatus(
            input.activeAssignmentId,
            'INACTIVE',
            input.assignAt,
        );
    }

    // Gọi API để tạo assignment mới với GV mới
    await createTeachingAssignment({
        teacherId: input.newTeacherId,
        courseSectionId: input.courseSectionId,
        assignAt: input.assignAt,
    });

    const { items: sectionEntries } =
        await fetchCourseSectionTimetableEntries(input.courseSectionId, {
            semesterId: input.semesterId,
            limit: 100,
        });

    await Promise.all(
        sectionEntries
            .filter((entry) => entry.status === 'ACTIVE')
            .map((entry) =>
                updateTimetableEntry(entry.id, {
                    teacherId: input.newTeacherId,
                }),
            ),
    );
}

export function CourseSectionDetailPage() {
    const { id = '' } = useParams();
    const queryClient = useQueryClient();
    const { session } = useAuth();
    const role = session?.user.role;
    const isAdmin = role === 'SCHOOL_ADMIN';
    const backNavigation = getBackNavigation(role);
    const [showChangeTeacher, setShowChangeTeacher] = useState(false);

    const sectionQuery = useQuery({
        queryKey: ['course-sections', id],
        queryFn: () => fetchCourseSection(id),
        enabled: Boolean(id),
    });

    const section = sectionQuery.data;

    const yearsQuery = useQuery({
        queryKey: ['academic-years', 'all'],
        queryFn: fetchAllAcademicYears,
        enabled: Boolean(section),
    });

    const semestersQuery = useQuery({
        queryKey: ['semesters', section?.academicYearId],
        queryFn: () => fetchSemesters(section!.academicYearId),
        enabled: Boolean(section?.academicYearId),
    });

    const homeroomClassesQuery = useQuery({
        queryKey: ['homeroom-classes', section?.academicYearId, 'detail'],
        queryFn: () =>
            fetchHomeroomClasses({
                academicYearId: section!.academicYearId,
                limit: 100,
                page: 1,
                status: 'ACTIVE',
            }),
        enabled: Boolean(section?.academicYearId),
    });

    const assignmentsQuery = useQuery({
        queryKey: ['teaching-assignments', 'course-section', id],
        queryFn: () =>
            fetchTeachingAssignments({
                courseSectionId: id,
                limit: 50,
                includeAllSemesters: true,
            }),
        enabled: Boolean(id),
    });

    const activeAssignment = useMemo(
        () =>
            assignmentsQuery.data?.items.find(
                (assignment) => assignment.status === 'ACTIVE',
            ),
        [assignmentsQuery.data?.items],
    );

    const teacherTimetableQuery = useQuery({
        queryKey: [
            'timetable-entries',
            'teacher',
            activeAssignment?.teacherId,
            section?.semesterId,
        ],
        queryFn: () =>
            fetchTimetableEntries({
                teacherId: activeAssignment!.teacherId,
                semesterId: section!.semesterId,
                limit: 100,
                status: 'ACTIVE',
            }),
        enabled: Boolean(activeAssignment?.teacherId && section?.semesterId),
    });

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting, isDirty },
    } = useForm<EditFormValues>({
        resolver: zodResolver(editSchema),
        values: section
            ? {
                  name: section.name,
                  code: section.code,
                  homeroomClassId: section.homeroomClassId ?? '',
              }
            : undefined,
    });

    const gradeLevelSubjectQuery = useQuery({
        queryKey: ['grade-level-subjects', section?.gradeLevelSubjectId],
        queryFn: () => fetchGradeLevelSubject(section!.gradeLevelSubjectId),
        enabled: Boolean(section?.gradeLevelSubjectId),
    });

    const teachersQuery = useQuery({
        queryKey: ['teachers', session?.activeSchoolId, 'all'],
        queryFn: fetchAllTeachers,
        enabled: Boolean(isAdmin && showChangeTeacher),
    });

    const updateMutation = useMutation({
        mutationFn: (values: EditFormValues) =>
            updateCourseSection(id, {
                name: values.name,
                code: values.code,
                homeroomClassId: values.homeroomClassId || null,
            }),
        onSuccess: (updated) => {
            queryClient.setQueryData(['course-sections', id], updated);
            void queryClient.invalidateQueries({
                queryKey: ['course-sections'],
            });
            toast.success('Cập nhật lớp môn học thành công');
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

    const statusMutation = useMutation({
        mutationFn: (status: 'ACTIVE' | 'INACTIVE') =>
            updateCourseSectionStatus(id, status),
        onSuccess: (updated) => {
            queryClient.setQueryData(['course-sections', id], updated);
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

    const changeTeacherMutation = useMutation({
        mutationFn: (values: ChangeCourseSectionTeacherFormValues) =>
            changeCourseSectionTeacher({
                courseSectionId: id,
                semesterId: section!.semesterId,
                activeAssignmentId: activeAssignment?.id ?? null,
                newTeacherId: values.teacherId,
                assignAt: values.assignAt,
            }),
        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: ['teaching-assignments', 'course-section', id],
            });
            void queryClient.invalidateQueries({
                queryKey: ['timetable-entries'],
            });
            void queryClient.invalidateQueries({
                queryKey: ['course-sections', id, 'timetable-entries'],
            });
            toast.success(
                activeAssignment
                    ? 'Đổi giáo viên thành công'
                    : 'Phân công giáo viên thành công',
            );
            setShowChangeTeacher(false);
        },
        onError: (error) => {
            const apiError = getApiError(error);
            toast.error(
                getErrorMessage(
                    apiError?.code,
                    apiError?.message ?? 'Đổi giáo viên thất bại',
                ),
            );
        },
    });

    const assignmentColumns = useMemo<ColumnDef<TeachingAssignment>[]>(
        () => [
            { accessorKey: 'teacherFullName', header: 'Giáo viên' },
            {
                accessorKey: 'assignAt',
                header: 'Ngày phân công',
                cell: ({ row }) => formatDateVi(row.original.assignAt),
            },
            {
                accessorKey: 'status',
                header: 'Trạng thái',
                cell: ({ row }) => ACADEMIC_STATUS_LABELS[row.original.status],
            },
        ],
        [],
    );

    if (sectionQuery.isLoading) return <LoadingState />;
    if (sectionQuery.isError || !section) {
        return (
            <ErrorState
                message='Không tải được chi tiết lớp môn học'
                onRetry={() => void sectionQuery.refetch()}
            />
        );
    }

    const academicYear = yearsQuery.data?.items.find(
        (year) => year.id === section.academicYearId,
    );
    const semester = semestersQuery.data?.find(
        (item) => item.id === section.semesterId,
    );
    const homeroomClass = homeroomClassesQuery.data?.items.find(
        (item) => item.id === section.homeroomClassId,
    );

    return (
        <div className='space-y-6'>
            <div>
                <Link
                    to={backNavigation.to}
                    className='text-sm text-muted-foreground hover:text-foreground'
                >
                    {backNavigation.label}
                </Link>
                <div className='mt-2 flex flex-wrap items-center gap-3'>
                    <h1 className='text-2xl font-semibold'>
                        {section.code} — {section.name}
                    </h1>
                    <span
                        className={cn(
                            'inline-flex rounded-md px-2 py-0.5 text-xs font-medium',
                            STATUS_BADGE[section.status],
                        )}
                    >
                        {ACADEMIC_STATUS_LABELS[section.status]}
                    </span>
                </div>
                <p className='text-sm text-muted-foreground'>
                    {academicYear?.name ?? '—'} · {semester?.name ?? '—'}
                    {homeroomClass
                        ? ` · Lớp HC: ${homeroomClass.name}`
                        : ' · Lớp ghép'}
                </p>
            </div>

            <div className='grid gap-6 lg:grid-cols-2'>
                <Card>
                    <CardHeader>
                        <CardTitle>Thông tin</CardTitle>
                        {isAdmin && (
                            <CardDescription>
                                Tạo lúc {formatDateTimeVi(section.createdAt)} ·
                                Cập nhật {formatDateTimeVi(section.updatedAt)}
                            </CardDescription>
                        )}
                    </CardHeader>
                    <CardContent>
                        {isAdmin ? (
                            <form
                                className='space-y-4'
                                onSubmit={handleSubmit((values) =>
                                    updateMutation.mutate(values),
                                )}
                            >
                                <div className='space-y-2'>
                                    <Label htmlFor='cs-detail-code'>
                                        Mã lớp môn
                                    </Label>
                                    <Input
                                        id='cs-detail-code'
                                        {...register('code')}
                                    />
                                    {errors.code ? (
                                        <p className='text-sm text-destructive'>
                                            {errors.code.message}
                                        </p>
                                    ) : null}
                                </div>
                                <div className='space-y-2'>
                                    <Label htmlFor='cs-detail-name'>
                                        Tên lớp môn
                                    </Label>
                                    <Input
                                        id='cs-detail-name'
                                        {...register('name')}
                                    />
                                    {errors.name ? (
                                        <p className='text-sm text-destructive'>
                                            {errors.name.message}
                                        </p>
                                    ) : null}
                                </div>
                                <div className='space-y-2'>
                                    <Label htmlFor='cs-detail-hc'>
                                        Lớp hành chính
                                    </Label>
                                    <select
                                        id='cs-detail-hc'
                                        className={selectClassName}
                                        {...register('homeroomClassId')}
                                    >
                                        <option value=''>
                                            Không gắn / lớp ghép
                                        </option>
                                        {homeroomClassesQuery.data?.items.map(
                                            (hc) => (
                                                <option
                                                    key={hc.id}
                                                    value={hc.id}
                                                >
                                                    {hc.name}
                                                </option>
                                            ),
                                        )}
                                    </select>
                                </div>
                                <div className='flex flex-wrap gap-2'>
                                    <Button
                                        type='submit'
                                        disabled={
                                            !isDirty ||
                                            isSubmitting ||
                                            updateMutation.isPending
                                        }
                                    >
                                        {updateMutation.isPending
                                            ? 'Đang lưu...'
                                            : 'Lưu thay đổi'}
                                    </Button>
                                    <Button
                                        type='button'
                                        variant='outline'
                                        disabled={statusMutation.isPending}
                                        onClick={() =>
                                            statusMutation.mutate(
                                                section.status === 'ACTIVE'
                                                    ? 'INACTIVE'
                                                    : 'ACTIVE',
                                            )
                                        }
                                    >
                                        {section.status === 'ACTIVE'
                                            ? 'Ngưng hoạt động'
                                            : 'Kích hoạt'}
                                    </Button>
                                </div>
                            </form>
                        ) : (
                            <div className='grid gap-3 sm:grid-cols-2'>
                                <div>
                                    <p className='text-sm text-muted-foreground'>
                                        Mã lớp môn
                                    </p>
                                    <p className='font-medium'>
                                        {section.code}
                                    </p>
                                </div>
                                <div>
                                    <p className='text-sm text-muted-foreground'>
                                        Tên lớp môn
                                    </p>
                                    <p className='font-medium'>
                                        {section.name}
                                    </p>
                                </div>
                                <div>
                                    <p className='text-sm text-muted-foreground'>
                                        Lớp hành chính
                                    </p>
                                    <p className='font-medium'>
                                        {homeroomClass?.name ??
                                            (section.homeroomClassId
                                                ? '—'
                                                : 'Lớp ghép')}
                                    </p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className='flex flex-row flex-wrap items-start justify-between gap-4'>
                    <div className='space-y-1'>
                        <CardTitle>Phân công giảng dạy</CardTitle>
                        <CardDescription>
                            Quản lý giáo viên phụ trách lớp môn trong{' '}
                            {semester?.name ?? 'học kỳ này'}.
                        </CardDescription>
                    </div>
                    {gradeLevelSubjectQuery.data ? (
                        <span className='inline-flex rounded-full border bg-muted/40 px-3 py-1 text-xs font-medium'>
                            Môn: {gradeLevelSubjectQuery.data.subjectName}
                        </span>
                    ) : null}
                </CardHeader>
                <CardContent className='space-y-6'>
                    {!showChangeTeacher ? (
                        <div className='space-y-4'>
                            <CurrentTeacherSummary
                                activeAssignment={activeAssignment}
                                subjectName={
                                    gradeLevelSubjectQuery.data?.subjectName
                                }
                            />
                            {isAdmin ? (
                                <Button
                                    type='button'
                                    variant='outline'
                                    onClick={() => setShowChangeTeacher(true)}
                                >
                                    {activeAssignment
                                        ? 'Đổi giáo viên'
                                        : 'Phân công giáo viên'}
                                </Button>
                            ) : null}
                        </div>
                    ) : (
                        <div className='rounded-xl border bg-card p-4 md:p-5'>
                            <ChangeCourseSectionTeacherForm
                                key={
                                    activeAssignment?.id ??
                                    'new-assignment'
                                }
                                activeAssignment={activeAssignment}
                                subject={gradeLevelSubjectQuery.data}
                                semesterName={semester?.name}
                                teachers={teachersQuery.data}
                                isLoadingTeachers={teachersQuery.isLoading}
                                isLoadingSubject={
                                    gradeLevelSubjectQuery.isLoading
                                }
                                isSubmitting={changeTeacherMutation.isPending}
                                onSubmit={(values) => {
                                    if (
                                        activeAssignment &&
                                        values.teacherId ===
                                            activeAssignment.teacherId
                                    ) {
                                        toast.error(
                                            'Giáo viên mới phải khác giáo viên hiện tại',
                                        );
                                        return;
                                    }
                                    changeTeacherMutation.mutate(values);
                                }}
                                onCancel={() => setShowChangeTeacher(false)}
                            />
                        </div>
                    )}

                    {assignmentsQuery.isLoading ? <LoadingState /> : null}
                    {(assignmentsQuery.data?.items.length ?? 0) > 0 ? (
                        <div>
                            <p className='mb-2 text-sm font-medium'>
                                Lịch sử phân công
                            </p>
                            <DataTableGrid
                                data={assignmentsQuery.data?.items ?? []}
                                columns={assignmentColumns}
                            />
                        </div>
                    ) : null}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Thời khóa biểu giáo viên</CardTitle>
                    <CardDescription>
                        {activeAssignment ? (
                            <>
                                TKB đầy đủ của{' '}
                                <span className='font-medium text-foreground'>
                                    {activeAssignment.teacherFullName}
                                </span>{' '}
                                trong {semester?.name ?? 'học kỳ đã chọn'}
                            </>
                        ) : (
                            <>Phân công giáo viên để xem thời khóa biểu</>
                        )}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {!activeAssignment ? (
                        <p className='text-sm text-muted-foreground'>
                            Chưa có giáo viên được phân công.
                        </p>
                    ) : null}
                    {activeAssignment && teacherTimetableQuery.isLoading ? (
                        <LoadingState />
                    ) : null}
                    {activeAssignment && teacherTimetableQuery.isError ? (
                        <ErrorState
                            message='Không tải được thời khóa biểu'
                            onRetry={() =>
                                void teacherTimetableQuery.refetch()
                            }
                        />
                    ) : null}
                    {activeAssignment && teacherTimetableQuery.isSuccess ? (
                        <TimetableEntryList
                            entries={teacherTimetableQuery.data.items}
                            emptyMessage={`Chưa có tiết học trong ${semester?.name ?? 'học kỳ này'}.`}
                        />
                    ) : null}
                </CardContent>
            </Card>
        </div>
    );
}
