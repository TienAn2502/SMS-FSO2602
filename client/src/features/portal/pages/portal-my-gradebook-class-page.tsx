import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { toast } from 'sonner';

import { ROUTES } from '@/app/router/routes';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
    GradebookSemesterGrid,
    buildGradebookGridDraft,
    computeGradebookDirtyChanges,
    countGradebookIncompleteCells,
    hasGradebookDraftChanges,
    type GradebookGridDraft,
} from '@/features/gradebook/components/gradebook-semester-grid';
import { GradebookPortalImportExportActions } from '@/features/portal/components/gradebook-portal-import-export-actions';
import {
    fetchMyGradebookGrid,
    lockGradebook,
    patchGradebookScores,
} from '@/features/portal/api/portal-api';
import { getApiError } from '@/lib/api';
import { getErrorMessage } from '@/lib/error-messages';

function formatIncompleteGradebookMessage(incompleteCount: number) {
    return `Chưa nhập đủ điểm (${incompleteCount} ô còn thiếu). Hoàn thiện tất cả đầu điểm trước khi khóa sổ.`;
}

export function PortalMyGradebookClassPage() {
    const { courseSectionId } = useParams<{ courseSectionId: string }>();
    const queryClient = useQueryClient();
    const [baseline, setBaseline] = useState<GradebookGridDraft>({}); // data từ BE và không đổi khi GV nhập draft
    const [draft, setDraft] = useState<GradebookGridDraft>({}); // Lưu điểm từ DB và bản nháp GV nhập
    const [lockDialogOpen, setLockDialogOpen] = useState(false);

    const gridQuery = useQuery({
        queryKey: ['portal', 'my-gradebook-classes', courseSectionId, 'grid'],
        queryFn: () => fetchMyGradebookGrid(courseSectionId!),
        enabled: Boolean(courseSectionId),
    });

    useEffect(() => {
        if (gridQuery.data) {
            // Biến đổi data thành dạng {assessmentId:studentId: {score: '', note: ''}}
            const nextDraft = buildGradebookGridDraft(gridQuery.data);

            setBaseline(nextDraft);
            setDraft(nextDraft);
        }
    }, [gridQuery.data]);

    // Kiểm tra xem có thay đổi so với baseline không
    const hasChanges = useMemo(
        () => hasGradebookDraftChanges(baseline, draft),
        [baseline, draft],
    );

    const saveMutation = useMutation({
        mutationFn: async () => {
            const grid = gridQuery.data;
            if (!grid || !courseSectionId) {
                return;
            }

            // Mảng các phần tử đã thay đổi so với baseline
            const changes = computeGradebookDirtyChanges(grid, baseline, draft);
            if (changes.length === 0) {
                return;
            }

            await patchGradebookScores(courseSectionId, { changes });
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: [
                    'portal',
                    'my-gradebook-classes',
                    courseSectionId,
                    'grid',
                ],
            });
            toast.success('Đã lưu sổ điểm');
        },
        onError: (error) => {
            if (
                error instanceof Error &&
                error.message === 'INVALID_SCORE_INPUT'
            ) {
                toast.error('Điểm chỉ được là số nguyên hoặc .25, .5, .75');
                return;
            }

            const apiError = getApiError(error);
            toast.error(
                getErrorMessage(
                    apiError?.code,
                    apiError?.message ?? 'Không lưu được sổ điểm',
                ),
            );
        },
    });

    const lockMutation = useMutation({
        mutationFn: async () => {
            if (!courseSectionId) {
                return;
            }

            return lockGradebook(courseSectionId);
        },
        onSuccess: async () => {
            setLockDialogOpen(false);
            await queryClient.invalidateQueries({
                queryKey: [
                    'portal',
                    'my-gradebook-classes',
                    courseSectionId,
                    'grid',
                ],
            });
            toast.success('Đã khóa sổ điểm');
        },
        onError: (error) => {
            const apiError = getApiError(error);
            toast.error(
                getErrorMessage(
                    apiError?.code,
                    apiError?.message ?? 'Không khóa được sổ điểm',
                ),
            );
        },
    });

    const incompleteCount = useMemo(() => {
        if (!gridQuery.data || gridQuery.data.isLocked) {
            return 0;
        }

        return countGradebookIncompleteCells(gridQuery.data, draft);
    }, [gridQuery.data, draft]);

    const tryOpenLockDialog = () => {
        if (!gridQuery.data?.semesterIsCurrent) {
            return;
        }

        if (hasChanges) {
            toast.error('Vui lòng lưu sổ điểm trước khi khóa');
            return;
        }

        if (incompleteCount > 0) {
            toast.error(formatIncompleteGradebookMessage(incompleteCount));
            return;
        }

        setLockDialogOpen(true);
    };

    const handleLockGradebook = () => {
        const grid = gridQuery.data;
        if (!grid) {
            return;
        }

        if (hasChanges) {
            toast.error('Vui lòng lưu sổ điểm trước khi khóa');
            setLockDialogOpen(false);
            return;
        }

        if (incompleteCount > 0) {
            toast.error(formatIncompleteGradebookMessage(incompleteCount));
            setLockDialogOpen(false);
            return;
        }

        lockMutation.mutate();
    };

    if (gridQuery.isLoading) return <LoadingState />;
    if (gridQuery.isError || !gridQuery.data) {
        return (
            <ErrorState
                message='Không tải được sổ điểm lớp môn'
                onRetry={() => void gridQuery.refetch()}
            />
        );
    }

    const grid = gridQuery.data;
    const canModify = grid.semesterIsCurrent && !grid.isLocked;
    const canEditGrid = canModify;

    return (
        <div className='space-y-6'>
            <div className='flex flex-wrap items-start justify-between gap-4'>
                <div>
                    <Link
                        to={ROUTES.portalGradebook}
                        className='text-sm text-muted-foreground hover:text-foreground'
                    >
                        ← Danh sách lớp môn
                    </Link>
                    <h1 className='mt-2 text-2xl font-semibold'>
                        {grid.courseSectionCode} — {grid.courseSectionName}
                    </h1>
                    <p className='text-sm text-muted-foreground'>
                        {grid.subjectName ?? grid.subjectCode}
                        {grid.homeroomClassCode
                            ? ` · Lớp HC ${grid.homeroomClassCode}`
                            : ''}{' '}
                        · {grid.academicYearName} · {grid.semesterName}
                    </p>
                    <p className='mt-1 text-sm text-muted-foreground'>
                        {grid.periodsPerYear ?? '—'} tiết/năm ·{' '}
                        {grid.regularTxPerYear} điểm TX/năm
                        {grid.isLocked ? ' · Sổ điểm đã khóa' : ''}
                        {!grid.semesterIsCurrent && !grid.isLocked
                            ? ' · Chỉ xem (không phải học kỳ hiện hành)'
                            : ''}
                    </p>
                </div>

                {!grid.isLocked ? (
                    <div className='flex flex-wrap gap-2'>
                        <GradebookPortalImportExportActions
                            courseSectionId={courseSectionId!}
                            assessments={grid.columns}
                            canImport={canModify}
                            onImportSuccess={async () => {
                                await queryClient.invalidateQueries({
                                    queryKey: [
                                        'portal',
                                        'my-gradebook-classes',
                                        courseSectionId,
                                        'grid',
                                    ],
                                });
                            }}
                        />

                        <Button
                            type='button'
                            disabled={
                                !canModify ||
                                !hasChanges ||
                                saveMutation.isPending
                            }
                            onClick={() => saveMutation.mutate()}
                        >
                            {saveMutation.isPending
                                ? 'Đang lưu…'
                                : 'Lưu sổ điểm'}
                        </Button>

                        <AlertDialog
                            open={lockDialogOpen}
                            onOpenChange={setLockDialogOpen}
                        >
                            <Button
                                type='button'
                                variant='outline'
                                disabled={!canModify || lockMutation.isPending}
                                onClick={tryOpenLockDialog}
                            >
                                Khóa sổ điểm
                            </Button>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>
                                        Khóa sổ điểm?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Sau khi khóa, bạn không thể sửa điểm
                                        trên sổ này. Tất cả đầu điểm sẽ được
                                        đóng.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel variant='outline'>
                                        Hủy
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                        disabled={lockMutation.isPending}
                                        onClick={handleLockGradebook}
                                    >
                                        {lockMutation.isPending
                                            ? 'Đang khóa…'
                                            : 'Khóa sổ điểm'}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                ) : (
                    <GradebookPortalImportExportActions
                        courseSectionId={courseSectionId!}
                        assessments={grid.columns}
                        canImport={false}
                        onImportSuccess={async () => {
                            await queryClient.invalidateQueries({
                                queryKey: [
                                    'portal',
                                    'my-gradebook-classes',
                                    courseSectionId,
                                    'grid',
                                ],
                            });
                        }}
                    />
                )}
            </div>

            {canModify && incompleteCount > 0 ? (
                <div
                    role='alert'
                    className='rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950'
                >
                    {formatIncompleteGradebookMessage(incompleteCount)}
                </div>
            ) : null}

            <GradebookSemesterGrid
                grid={grid}
                draft={draft}
                readonly={!canEditGrid}
                onDraftChange={(assessmentId, studentId, patch) => {
                    setDraft((current) => {
                        const key = `${assessmentId}:${studentId}`;
                        const previous = current[key] ?? {
                            score: '',
                            note: '',
                        };

                        return {
                            ...current, // các HS không thay đổi
                            [key]: { ...previous, ...patch },
                        };
                    });
                }}
            />
        </div>
    );
}
