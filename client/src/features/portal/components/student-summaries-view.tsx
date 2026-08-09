import { useMemo } from 'react';

import {
    ACADEMIC_RESULT_LEVEL_LABELS,
    PROMOTION_DECISION_LABELS,
    SUMMARY_STATUS_LABELS,
    TRAINING_RESULT_LEVEL_LABELS,
} from '@/lib/labels';
import type {
    PortalStudentScoresGrid,
    PortalStudentSummaries,
} from '@/features/portal/api/portal-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/feedback/empty-state';
import {
    StudentScoresGrid,
    type FinalizedSubjectResult,
} from '@/features/portal/components/student-scores-grid';

function levelLabel(
    map: Record<string, string>,
    value: string | null | undefined,
) {
    if (!value) return '—';
    return map[value] ?? value;
}

function formatDateTime(value: string | null | undefined) {
    if (!value) return '—';
    return new Date(value).toLocaleString('vi-VN');
}

export function StudentSummariesView({
    data,
    scoresGrid,
    semesterName,
}: {
    data: PortalStudentSummaries;
    scoresGrid?: PortalStudentScoresGrid | null;
    semesterName?: string | null;
}) {
    const title = semesterName ?? data.semesterName ?? 'Tổng kết';

    const finalizedSubjectResults = useMemo(() => {
        const map: Record<string, FinalizedSubjectResult> = {};
        for (const row of data.subjectResults) {
            map[row.courseSectionId] = {
                evaluationMode: row.evaluationMode,
                semesterAverage: row.semesterAverage,
                passFailResult: row.passFailResult,
            };
        }
        return map;
    }, [data.subjectResults]);

    if (
        !data.semesterSummary &&
        data.subjectResults.length === 0 &&
        !scoresGrid?.rows.length
    ) {
        return (
            <EmptyState
                title='Chưa có tổng kết'
                description='Kết quả sẽ hiển thị sau khi nhà trường chốt học kỳ.'
            />
        );
    }

    return (
        <div className='space-y-6'>
            {scoresGrid ? (
                <Card>
                    <CardHeader>
                        <CardTitle>Bảng điểm {title}</CardTitle>
                    </CardHeader>
                    <CardContent className='space-y-3'>
                        <p className='text-sm text-muted-foreground'>
                            {scoresGrid.academicYearName} ·{' '}
                            {scoresGrid.semesterName}
                            {scoresGrid.homeroomClassCode
                                ? ` · Lớp ${scoresGrid.homeroomClassCode}`
                                : data.semesterSummary?.homeroomClassCode
                                  ? ` · Lớp ${data.semesterSummary.homeroomClassCode}`
                                  : null}
                        </p>
                        <StudentScoresGrid
                            grid={scoresGrid}
                            finalizedSubjectResults={finalizedSubjectResults}
                            averageColumnLabel='ĐTB môn'
                        />
                    </CardContent>
                </Card>
            ) : null}

            {data.semesterSummary ? (
                <Card>
                    <CardHeader>
                        <CardTitle>Tổng kết học kỳ</CardTitle>
                    </CardHeader>
                    <CardContent className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-sm'>
                        <div>
                            <p className='text-muted-foreground'>
                                Điểm TB chung
                            </p>
                            <p className='text-lg font-semibold tabular-nums'>
                                {data.semesterSummary.overallAverage ?? '—'}
                            </p>
                        </div>
                        <div>
                            <p className='text-muted-foreground'>Học lực</p>
                            <p className='text-lg font-semibold'>
                                {levelLabel(
                                    ACADEMIC_RESULT_LEVEL_LABELS,
                                    data.semesterSummary.academicResultLevel,
                                )}
                            </p>
                        </div>
                        <div>
                            <p className='text-muted-foreground'>Rèn luyện</p>
                            <p className='text-lg font-semibold'>
                                {levelLabel(
                                    TRAINING_RESULT_LEVEL_LABELS,
                                    data.conductRecord?.trainingResultLevel ??
                                        data.semesterSummary
                                            .trainingResultLevel,
                                )}
                            </p>
                        </div>
                        <div>
                            <p className='text-muted-foreground'>
                                Số môn tính TB
                            </p>
                            <p className='font-medium'>
                                {data.semesterSummary.subjectCount}
                            </p>
                        </div>
                        <div>
                            <p className='text-muted-foreground'>
                                Lớp chủ nhiệm
                            </p>
                            <p className='font-medium'>
                                {data.semesterSummary.homeroomClassCode ?? '—'}
                            </p>
                        </div>
                        <div>
                            <p className='text-muted-foreground'>Trạng thái</p>
                            <p className='font-medium'>
                                {levelLabel(
                                    SUMMARY_STATUS_LABELS,
                                    data.semesterSummary.status,
                                )}
                            </p>
                        </div>
                        {data.conductRecord?.note ? (
                            <div className='sm:col-span-2 lg:col-span-3'>
                                <p className='text-muted-foreground'>
                                    Nhận xét rèn luyện
                                </p>
                                <p className='font-medium'>
                                    {data.conductRecord.note}
                                </p>
                            </div>
                        ) : null}
                        <div>
                            <p className='text-muted-foreground'>Ngày chốt</p>
                            <p className='font-medium'>
                                {formatDateTime(
                                    data.semesterSummary.finalizedAt,
                                )}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            ) : null}

            {data.yearSummary ? (
                <Card>
                    <CardHeader>
                        <CardTitle>
                            Cả năm — {data.yearSummary.academicYearName}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm'>
                        <div>
                            <p className='text-muted-foreground'>TB năm</p>
                            <p className='font-medium'>
                                {data.yearSummary.overallAverage ?? '—'}
                            </p>
                        </div>
                        <div>
                            <p className='text-muted-foreground'>Học lực năm</p>
                            <p className='font-medium'>
                                {levelLabel(
                                    ACADEMIC_RESULT_LEVEL_LABELS,
                                    data.yearSummary.academicResultLevel,
                                )}
                            </p>
                        </div>
                        <div>
                            <p className='text-muted-foreground'>Rèn luyện năm</p>
                            <p className='font-medium'>
                                {levelLabel(
                                    TRAINING_RESULT_LEVEL_LABELS,
                                    data.yearSummary.trainingResultLevel,
                                )}
                            </p>
                        </div>
                        <div>
                            <p className='text-muted-foreground'>Buổi vắng</p>
                            <p className='font-medium'>
                                {data.yearSummary.absentSessionCount ?? '—'}
                            </p>
                        </div>
                        <div>
                            <p className='text-muted-foreground'>Quyết định</p>
                            <p className='font-medium'>
                                {levelLabel(
                                    PROMOTION_DECISION_LABELS,
                                    data.yearSummary.promotionDecision,
                                )}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            ) : null}
        </div>
    );
}
