import { zodResolver } from '@hookform/resolvers/zod';
import { UserRoundIcon } from 'lucide-react';
import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { SearchableCombobox } from '@/components/common/searchable-combobox';
import { LoadingState } from '@/components/feedback/loading-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import type { GradeLevelSubject } from '@/features/grade-level-subjects/api/grade-level-subjects-api';
import type { Teacher } from '@/features/teachers/api/teachers-api';
import type { TeachingAssignment } from '@/features/teaching-assignments/api/teaching-assignments-api';
import { formatDateVi } from '@/lib/date-format';
import { ACADEMIC_STATUS_LABELS } from '@/lib/labels';
import { teacherMatchesSubjectSpecialization } from '@/lib/teacher-specialization';
import { cn } from '@/lib/utils';

const changeTeacherSchema = z.object({
    teacherId: z.string().uuid('Chọn giáo viên'),
    assignAt: z.string().min(1, 'Chọn ngày phân công'),
});

export type ChangeCourseSectionTeacherFormValues = z.infer<
    typeof changeTeacherSchema
>;

interface ChangeCourseSectionTeacherFormProps {
    activeAssignment: TeachingAssignment | undefined;
    subject: GradeLevelSubject | undefined;
    semesterName?: string;
    teachers: Teacher[] | undefined;
    isLoadingTeachers: boolean;
    isLoadingSubject: boolean;
    isSubmitting: boolean;
    onSubmit: (values: ChangeCourseSectionTeacherFormValues) => void;
    onCancel: () => void;
}

export function ChangeCourseSectionTeacherForm({
    activeAssignment,
    subject,
    semesterName,
    teachers,
    isLoadingTeachers,
    isLoadingSubject,
    isSubmitting,
    onSubmit,
    onCancel,
}: ChangeCourseSectionTeacherFormProps) {
    const {
        control,
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ChangeCourseSectionTeacherFormValues>({
        resolver: zodResolver(changeTeacherSchema),
        defaultValues: {
            teacherId: '',
            assignAt: new Date().toISOString().slice(0, 10),
        },
    });

    const eligibleTeachers = useMemo(() => {
        if (!subject || !teachers) {
            return [];
        }

        return teachers
            .filter(
                (teacher) =>
                    teacher.id !== activeAssignment?.teacherId &&
                    teacherMatchesSubjectSpecialization(teacher, {
                        subjectName: subject.subjectName,
                        subjectCode: subject.subjectCode,
                    }),
            )
            .sort((left, right) =>
                left.fullName.localeCompare(right.fullName, 'vi'),
            );
    }, [activeAssignment?.teacherId, subject, teachers]);

    const teacherOptions = useMemo(
        () =>
            eligibleTeachers.map((teacher) => ({
                value: teacher.id,
                label: teacher.fullName,
                description:
                    teacher.specialization ??
                    teacher.phone ??
                    undefined,
            })),
        [eligibleTeachers],
    );

    const isLoading = isLoadingTeachers || isLoadingSubject;

    return (
        <form
            className='space-y-5'
            onSubmit={handleSubmit(onSubmit)}
        >
            {activeAssignment ? (
                <div className='rounded-lg border bg-muted/30 p-4'>
                    <p className='text-xs font-medium tracking-wide text-muted-foreground uppercase'>
                        Giáo viên hiện tại
                    </p>
                    <div className='mt-3 flex items-start gap-3'>
                        <div className='flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary'>
                            <UserRoundIcon className='size-5' />
                        </div>
                        <div className='min-w-0'>
                            <p className='font-medium'>
                                {activeAssignment.teacherFullName}
                            </p>
                            <p className='text-sm text-muted-foreground'>
                                Phân công từ{' '}
                                {formatDateVi(activeAssignment.assignAt)}
                            </p>
                        </div>
                        <span className='ml-auto inline-flex rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400'>
                            {ACADEMIC_STATUS_LABELS[activeAssignment.status]}
                        </span>
                    </div>
                </div>
            ) : null}

            <Separator />

            <div className='space-y-4'>
                <div>
                    <h3 className='text-sm font-medium'>
                        {activeAssignment
                            ? 'Chọn giáo viên thay thế'
                            : 'Phân công giáo viên'}
                    </h3>
                    <p className='mt-1 text-sm text-muted-foreground'>
                        {subject ? (
                            <>
                                Chỉ hiển thị giáo viên có chuyên môn{' '}
                                <span className='font-medium text-foreground'>
                                    {subject.subjectName}
                                </span>
                                {eligibleTeachers.length > 0 ? (
                                    <>
                                        {' '}
                                        · {eligibleTeachers.length} giáo viên
                                        phù hợp
                                    </>
                                ) : null}
                            </>
                        ) : (
                            'Đang tải thông tin môn học...'
                        )}
                    </p>
                </div>

                <div className='grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]'>
                    <div className='space-y-2'>
                        <Label htmlFor='cs-change-teacher'>
                            {activeAssignment ? 'Giáo viên mới' : 'Giáo viên'}
                        </Label>
                        {isLoading ? (
                            <LoadingState />
                        ) : (
                            <Controller
                                name='teacherId'
                                control={control}
                                render={({ field }) => (
                                    <SearchableCombobox
                                        id='cs-change-teacher'
                                        value={field.value}
                                        onValueChange={field.onChange}
                                        options={teacherOptions}
                                        placeholder='Tìm và chọn giáo viên...'
                                        searchPlaceholder='Nhập tên giáo viên...'
                                        emptyMessage={
                                            subject
                                                ? `Không có giáo viên môn ${subject.subjectName} khớp từ khóa.`
                                                : 'Không có giáo viên phù hợp.'
                                        }
                                        disabled={
                                            !subject ||
                                            eligibleTeachers.length === 0
                                        }
                                        aria-invalid={Boolean(
                                            errors.teacherId,
                                        )}
                                    />
                                )}
                            />
                        )}
                        {!isLoading && eligibleTeachers.length === 0 ? (
                            <p className='text-sm text-muted-foreground'>
                                Không có giáo viên nào có chuyên môn{' '}
                                {subject?.subjectName ?? 'phù hợp'}.
                            </p>
                        ) : null}
                        {errors.teacherId ? (
                            <p className='text-sm text-destructive'>
                                {errors.teacherId.message}
                            </p>
                        ) : null}
                    </div>

                    <div className='space-y-2'>
                        <Label htmlFor='cs-change-assign-at'>
                            Ngày phân công
                        </Label>
                        <Input
                            id='cs-change-assign-at'
                            type='date'
                            {...register('assignAt')}
                        />
                        {errors.assignAt ? (
                            <p className='text-sm text-destructive'>
                                {errors.assignAt.message}
                            </p>
                        ) : null}
                    </div>
                </div>

                {activeAssignment ? (
                    <p className='rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-muted-foreground'>
                        Các tiết TKB của lớp môn trong{' '}
                        <span className='font-medium text-foreground'>
                            {semesterName ?? 'học kỳ này'}
                        </span>{' '}
                        sẽ được chuyển sang giáo viên mới.
                    </p>
                ) : null}
            </div>

            <div className='flex flex-wrap gap-2'>
                <Button
                    type='submit'
                    disabled={
                        isSubmitting ||
                        isLoading ||
                        eligibleTeachers.length === 0
                    }
                >
                    {isSubmitting
                        ? 'Đang lưu...'
                        : activeAssignment
                          ? 'Xác nhận đổi giáo viên'
                          : 'Phân công giáo viên'}
                </Button>
                <Button type='button' variant='ghost' onClick={onCancel}>
                    Hủy
                </Button>
            </div>
        </form>
    );
}

interface CurrentTeacherSummaryProps {
    activeAssignment: TeachingAssignment | undefined;
    subjectName?: string;
}

export function CurrentTeacherSummary({
    activeAssignment,
    subjectName,
}: CurrentTeacherSummaryProps) {
    if (!activeAssignment) {
        return (
            <div className='rounded-lg border border-dashed p-5 text-center'>
                <div className='mx-auto flex size-11 items-center justify-center rounded-full bg-muted'>
                    <UserRoundIcon className='size-5 text-muted-foreground' />
                </div>
                <p className='mt-3 font-medium'>Chưa phân công giáo viên</p>
                <p className='mt-1 text-sm text-muted-foreground'>
                    {subjectName
                        ? `Lớp môn ${subjectName} chưa có giáo viên phụ trách.`
                        : 'Hãy phân công giáo viên cho lớp môn này.'}
                </p>
            </div>
        );
    }

    return (
        <div className='rounded-lg border bg-muted/20 p-5'>
            <div className='flex items-start gap-4'>
                <div className='flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary'>
                    <UserRoundIcon className='size-6' />
                </div>
                <div className='min-w-0 flex-1'>
                    <p className='text-sm text-muted-foreground'>
                        Giáo viên phụ trách
                    </p>
                    <p className='mt-1 text-lg font-semibold'>
                        {activeAssignment.teacherFullName}
                    </p>
                    <p className='mt-1 text-sm text-muted-foreground'>
                        Phân công từ{' '}
                        {formatDateVi(activeAssignment.assignAt)}
                    </p>
                </div>
                <span
                    className={cn(
                        'inline-flex rounded-md px-2 py-0.5 text-xs font-medium',
                        'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
                    )}
                >
                    {ACADEMIC_STATUS_LABELS[activeAssignment.status]}
                </span>
            </div>
        </div>
    );
}
