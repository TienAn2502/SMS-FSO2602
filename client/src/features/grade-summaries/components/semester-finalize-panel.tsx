import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
    fetchSemesterFinalizeReadiness,
    finalizeSemesterAll,
    type SemesterFinalizeReadiness,
} from '@/features/grade-summaries/api/grade-summaries-api';
import { getApiError } from '@/lib/api';
import { getErrorMessage } from '@/lib/error-messages';

interface SemesterFinalizePanelProps {
    semesterId: string | undefined;
    onSelectHomeroom: (homeroomClassId: string) => void;
}

export function SemesterFinalizePanel({
    semesterId,
    onSelectHomeroom,
}: SemesterFinalizePanelProps) {
    const queryClient = useQueryClient();
    const [showIssues, setShowIssues] = useState(false);

    const readinessQuery = useQuery({
        queryKey: ['grade-summaries', 'finalize-readiness', semesterId],
        queryFn: () => fetchSemesterFinalizeReadiness(semesterId!),
        enabled: Boolean(semesterId),
    });

    const finalizeAllMutation = useMutation({
        mutationFn: () => finalizeSemesterAll(semesterId!),
        onSuccess: (data) => {
            toast.success(
                `Đã khóa học kỳ: ${data.semesterSummariesClosed} tổng kết, ${data.conductRecordsClosed} hạnh kiểm`,
            );
            void queryClient.invalidateQueries({
                queryKey: ['grade-summaries'],
            });
        },
        onError: (error) => toast.error(getErrorMessage(getApiError(error))),
    });

    if (!semesterId) {
        return null;
    }

    if (readinessQuery.isLoading) {
        return (
            <p className='text-sm text-muted-foreground'>
                Đang kiểm tra điều kiện khóa học kỳ…
            </p>
        );
    }

    if (readinessQuery.isError || !readinessQuery.data) {
        return (
            <p className='text-sm text-destructive'>
                Không tải được trạng thái khóa học kỳ
            </p>
        );
    }

    const readiness = readinessQuery.data;
    const issueCount = readiness.homeroomIssues.length;
    const finalizeDisabledReason = resolveFinalizeDisabledReason(readiness);

    return (
        <div className='space-y-3 rounded-lg border bg-muted/30 p-4'>
            <div className='flex flex-wrap items-center justify-between gap-2'>
                <div>
                    <p className='text-sm font-medium'>
                        Khóa học kỳ toàn trường
                    </p>
                    <p className='text-sm text-muted-foreground'>
                        {readiness.readyHomeroomClasses}/
                        {readiness.totalHomeroomClasses} lớp chủ nhiệm sẵn sàng
                        {readiness.alreadyClosed ? ' — học kỳ đã khóa' : null}
                    </p>
                </div>
                <div className='flex flex-wrap gap-2'>
                    {issueCount > 0 ? (
                        <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            onClick={() => setShowIssues((value) => !value)}
                        >
                            {showIssues ? (
                                <>
                                    <ChevronUp className='mr-1 size-4' />
                                    Ẩn vấn đề
                                </>
                            ) : (
                                <>
                                    <ChevronDown className='mr-1 size-4' />
                                    Xem {issueCount} lớp có vấn đề
                                </>
                            )}
                        </Button>
                    ) : null}
                    <Button
                        type='button'
                        size='sm'
                        disabled={
                            Boolean(finalizeDisabledReason) ||
                            finalizeAllMutation.isPending
                        }
                        title={finalizeDisabledReason ?? undefined}
                        onClick={() => finalizeAllMutation.mutate()}
                    >
                        Khóa học kỳ
                    </Button>
                </div>
            </div>

            {finalizeDisabledReason ? (
                <p className='text-sm text-muted-foreground'>
                    {finalizeDisabledReason}
                </p>
            ) : null}

            {showIssues && issueCount > 0 ? (
                <ul className='space-y-2 text-sm'>
                    {readiness.homeroomIssues.map((homeroom) => (
                        <li
                            key={homeroom.homeroomClassId}
                            className='rounded-md border bg-background p-3'
                        >
                            <button
                                type='button'
                                className='font-medium text-primary hover:underline'
                                onClick={() =>
                                    onSelectHomeroom(homeroom.homeroomClassId)
                                }
                            >
                                {homeroom.homeroomClassCode}
                            </button>
                            <ul className='mt-1 list-disc space-y-1 pl-5 text-muted-foreground'>
                                {homeroom.issues.map((issue, index) => (
                                    <li key={`${issue.code}-${index}`}>
                                        {issue.message}
                                        {issue.courseSectionCodes?.length ? (
                                            <span className='block text-xs'>
                                                Lớp môn:{' '}
                                                {issue.courseSectionCodes.join(
                                                    ', ',
                                                )}
                                            </span>
                                        ) : null}
                                    </li>
                                ))}
                            </ul>
                        </li>
                    ))}
                </ul>
            ) : null}
        </div>
    );
}

function resolveFinalizeDisabledReason(
    readiness: SemesterFinalizeReadiness,
): string | null {
    if (readiness.alreadyClosed) {
        return 'Học kỳ đã được khóa tổng kết';
    }

    if (!readiness.ready) {
        return 'Chưa đủ điều kiện — xem các vấn đề và xử lý từng lớp';
    }

    return null;
}
