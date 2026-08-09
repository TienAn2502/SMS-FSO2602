import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Circle } from 'lucide-react';
import { toast } from 'sonner';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
    fetchSemesterPreparationStatus,
    prepareSemesterFromSource,
    type Semester,
} from '@/features/academic-years/api/academic-years-api';
import { getApiError } from '@/lib/api';
import { getErrorMessage } from '@/lib/error-messages';
import { cn } from '@/lib/utils';

interface SemesterPreparationPanelProps {
    yearId: string;
    yearIsCurrent: boolean;
    source: Semester;
    target: Semester;
}

function resolvePreparationDisabledReason(
    yearIsCurrent: boolean,
    target: Semester,
): string | null {
    if (!yearIsCurrent) {
        return 'Chỉ chuẩn bị HK2 trong năm học hiện hành';
    }

    if (!target.isCurrent) {
        return 'Đặt HK2 là học kỳ hiện hành trước khi chuẩn bị dữ liệu';
    }

    return null;
}

function StatusRow({
    label,
    ready,
    sourceCount,
    targetCount,
}: {
    label: string;
    ready: boolean;
    sourceCount: number;
    targetCount: number;
}) {
    return (
        <div className='flex items-start gap-3 rounded-md border border-border px-3 py-2'>
            {ready ? (
                <CheckCircle2 className='mt-0.5 size-4 shrink-0 text-emerald-600' />
            ) : (
                <Circle className='mt-0.5 size-4 shrink-0 text-muted-foreground' />
            )}
            <div className='min-w-0 flex-1'>
                <p className='font-medium'>{label}</p>
                <p className='text-sm text-muted-foreground'>
                    HK đích: {targetCount}
                    {sourceCount > 0 ? ` / HK nguồn: ${sourceCount}` : ''}
                </p>
            </div>
        </div>
    );
}

export function SemesterPreparationPanel({
    yearId,
    yearIsCurrent,
    source,
    target,
}: SemesterPreparationPanelProps) {
    const queryClient = useQueryClient();
    const preparationDisabledReason = resolvePreparationDisabledReason(
        yearIsCurrent,
        target,
    );
    const preparationEnabled = preparationDisabledReason === null;

    const statusQuery = useQuery({
        queryKey: [
            'semester-preparation',
            yearId,
            target.id,
            source.id,
        ],
        queryFn: () =>
            fetchSemesterPreparationStatus(yearId, target.id, source.id),
        enabled: preparationEnabled,
    });

    const prepareMutation = useMutation({
        mutationFn: () =>
            prepareSemesterFromSource(yearId, target.id, {
                sourceSemesterId: source.id,
            }),
        onSuccess: (data) => {
            void queryClient.invalidateQueries({
                queryKey: ['semester-preparation'],
            });
            void queryClient.invalidateQueries({
                queryKey: ['student-enrollments'],
            });
            void queryClient.invalidateQueries({ queryKey: ['course-sections'] });
            void queryClient.invalidateQueries({
                queryKey: ['teaching-assignments'],
            });

            const { courseSections, enrollments, teachingAssignments } = data;
            const closeSuffix =
                enrollments.sourceClosedCount > 0
                    ? `; đã đóng ${enrollments.sourceClosedCount} ghi danh ${enrollments.sourceSemesterCode}`
                    : '';

            toast.success(
                `Đã chuẩn bị ${target.name}: ` +
                    `${courseSections.createdCount} lớp môn, ` +
                    `${enrollments.createdCount} ghi danh, ` +
                    `${teachingAssignments.createdCount} phân công` +
                    closeSuffix,
            );
        },
        onError: (error) => {
            const apiError = getApiError(error);
            toast.error(
                getErrorMessage(
                    apiError?.code,
                    apiError?.message ?? 'Không chuẩn bị được học kỳ',
                ),
            );
        },
    });

    const status = statusQuery.data;

    return (
        <div
            className={cn(
                'space-y-4 rounded-lg border border-border p-4',
                !preparationEnabled && 'opacity-60',
            )}
        >
            <div>
                <p className='font-medium'>Chuẩn bị {target.name}</p>
                <p className='mt-1 text-sm text-muted-foreground'>
                    Sao chép lớp môn, ghi danh và phân công giáo viên từ{' '}
                    {source.name} sang {target.name} trong một thao tác. Thao
                    tác an toàn khi chạy lại — dữ liệu đã có ở {target.name}{' '}
                    sẽ được bỏ qua.
                    {!source.isCurrent ? (
                        <>
                            {' '}
                            Ghi danh {source.name} sẽ được đóng tự động nếu HK
                            nguồn không còn hiện hành.
                        </>
                    ) : null}{' '}
                    Đặt {target.name} hiện hành sẽ tự đóng ghi danh{' '}
                    {source.name}.
                </p>
            </div>

            {status ? (
                <div className='grid gap-2 sm:grid-cols-3'>
                    <StatusRow
                        label='Lớp môn'
                        ready={status.courseSectionsReady}
                        sourceCount={status.source.courseSections}
                        targetCount={status.target.courseSections}
                    />
                    <StatusRow
                        label='Ghi danh'
                        ready={status.enrollmentsReady}
                        sourceCount={status.source.enrollments}
                        targetCount={status.target.enrollments}
                    />
                    <StatusRow
                        label='Phân công GV'
                        ready={status.teachingAssignmentsReady}
                        sourceCount={status.source.teachingAssignments}
                        targetCount={status.target.teachingAssignments}
                    />
                </div>
            ) : null}

            {preparationDisabledReason ? (
                <p className='text-sm text-muted-foreground'>
                    {preparationDisabledReason}
                </p>
            ) : null}

            <div className='flex flex-wrap items-center gap-3'>
                <AlertDialog>
                    <AlertDialogTrigger
                        render={
                            <Button
                                type='button'
                                disabled={
                                    !preparationEnabled ||
                                    prepareMutation.isPending ||
                                    status?.isComplete
                                }
                                title={preparationDisabledReason ?? undefined}
                            />
                        }
                    >
                        {status?.isComplete
                            ? `Đã chuẩn bị ${target.code}`
                            : `Chuẩn bị ${target.code} từ ${source.code}`}
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>
                                Chuẩn bị {target.name} từ {source.name}?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                Hệ thống sẽ lần lượt tạo lớp môn, ghi danh và
                                phân công giảng dạy cho {target.name} dựa trên{' '}
                                {source.name}. Thao tác có thể chạy lại nếu
                                thiếu một phần dữ liệu.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel variant='outline'>
                                Hủy
                            </AlertDialogCancel>
                            <AlertDialogAction
                                disabled={prepareMutation.isPending}
                                onClick={() => prepareMutation.mutate()}
                            >
                                {prepareMutation.isPending
                                    ? 'Đang chuẩn bị…'
                                    : 'Xác nhận'}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {status?.isComplete ? (
                    <span
                        className={cn(
                            'inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400',
                        )}
                    >
                        <CheckCircle2 className='size-3.5' />
                        Đã đủ lớp môn, ghi danh và phân công
                    </span>
                ) : null}
            </div>
        </div>
    );
}
