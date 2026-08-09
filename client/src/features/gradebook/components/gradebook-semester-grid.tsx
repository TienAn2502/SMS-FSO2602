import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import type {
    PortalGradebookGrid,
    PortalGradebookGridColumn,
    PortalGradebookGridRow,
} from '@/features/portal/api/portal-api';
import {
    computeSemesterAverage,
    isAbsentScoreCell,
} from '@/lib/gradebook-average';
import { SCORE_STEP, isValidScoreInput } from '@/lib/score-step';
import { cn } from '@/lib/utils';

export type GradebookGridDraft = Record<
    string,
    { score: string; note: string }
>;

function draftKey(assessmentId: string, studentId: string) {
    return `${assessmentId}:${studentId}`;
}

export function buildGradebookGridDraft(
    grid: PortalGradebookGrid,
): GradebookGridDraft {
    const draft: GradebookGridDraft = {};

    for (const row of grid.rows) {
        for (const column of grid.columns) {
            const cell = row.cells[column.slotKey];
            draft[draftKey(column.assessmentId, row.studentId)] = {
                score: cell?.score != null ? String(cell.score) : '',
                note: cell?.note ?? '',
            };
        }
    }

    return draft;
}

export function computeGradebookDirtyChanges(
    grid: PortalGradebookGrid,
    baseline: GradebookGridDraft,
    draft: GradebookGridDraft,
) {
    const changes: Array<{
        assessmentId: string;
        studentId: string;
        score: number | null;
        note: string | null;
    }> = [];

    for (const column of grid.columns) {
        for (const row of grid.rows) {
            const key = draftKey(column.assessmentId, row.studentId);
            const base = baseline[key] ?? { score: '', note: '' };
            const current = draft[key] ?? { score: '', note: '' };

            if (base.score === current.score && base.note === current.note) {
                continue;
            }

            const trimmed = current.score.trim();
            if (
                trimmed !== '' &&
                !isValidScoreInput(trimmed, column.maxScore)
            ) {
                throw new Error('INVALID_SCORE_INPUT');
            }

            changes.push({
                assessmentId: column.assessmentId,
                studentId: row.studentId,
                score: trimmed === '' ? null : Number.parseFloat(trimmed),
                note: current.note.trim() ? current.note.trim() : null,
            });
        }
    }

    return changes;
}

export function hasGradebookDraftChanges(
    baseline: GradebookGridDraft,
    draft: GradebookGridDraft,
) {
    const keys = new Set([...Object.keys(baseline), ...Object.keys(draft)]);

    for (const key of keys) {
        const base = baseline[key] ?? { score: '', note: '' };
        const current = draft[key] ?? { score: '', note: '' };

        if (base.score !== current.score || base.note !== current.note) {
            return true;
        }
    }

    return false;
}

function isGradebookDraftCellComplete(scoreText: string): boolean {
    const trimmedScore = scoreText.trim();
    if (trimmedScore === '') {
        return false;
    }

    const score = Number.parseFloat(trimmedScore);
    return !Number.isNaN(score);
}

export function countGradebookIncompleteCells(
    grid: PortalGradebookGrid,
    draft: GradebookGridDraft,
): number {
    let incompleteCount = 0;

    for (const column of grid.columns) {
        if (column.status !== 'OPEN') {
            continue;
        }

        for (const row of grid.rows) {
            const key = draftKey(column.assessmentId, row.studentId);
            const current = draft[key] ?? { score: '', note: '' };

            if (!isGradebookDraftCellComplete(current.score)) {
                incompleteCount += 1;
            }
        }
    }

    return incompleteCount;
}

function columnHeaderLabel(column: PortalGradebookGridColumn) {
    if (column.slotKey.startsWith('TX')) {
        return column.slotKey.replace('TX', 'TX ');
    }

    if (column.slotKey === 'GK') {
        return 'Giữa kỳ';
    }

    if (column.slotKey === 'CK') {
        return 'Cuối kỳ';
    }

    return column.name;
}

function computeRowAverage(
    row: PortalGradebookGridRow,
    columns: PortalGradebookGridColumn[],
    draft: GradebookGridDraft,
) {
    const inputs = columns.map((column) => {
        const current = draft[draftKey(column.assessmentId, row.studentId)] ?? {
            score: '',
            note: '',
        };
        const trimmed = current.score.trim();

        return {
            type: column.type,
            score:
                trimmed === ''
                    ? null
                    : isValidScoreInput(trimmed, column.maxScore)
                      ? Number.parseFloat(trimmed)
                      : null,
        };
    });

    return computeSemesterAverage(inputs);
}

interface GradebookSemesterGridProps {
    grid: PortalGradebookGrid;
    draft: GradebookGridDraft;
    readonly?: boolean;
    hideStudentColumn?: boolean;
    onDraftChange: (
        assessmentId: string,
        studentId: string,
        patch: Partial<{ score: string; note: string }>,
    ) => void;
}

export function GradebookSemesterGrid({
    grid,
    draft,
    readonly = false,
    hideStudentColumn = false,
    onDraftChange,
}: GradebookSemesterGridProps) {
    if (grid.columns.length === 0) {
        return (
            <p className='text-sm text-muted-foreground'>
                Đang khởi tạo sổ điểm… Vui lòng tải lại trang nếu bảng vẫn
                trống.
            </p>
        );
    }

    if (grid.rows.length === 0) {
        return (
            <p className='text-sm text-muted-foreground'>
                Chưa có học sinh ghi danh trong lớp hành chính.
            </p>
        );
    }

    return (
        <div className='overflow-x-auto rounded-md border'>
            <Table>
                <TableHeader>
                    <TableRow>
                        {!hideStudentColumn ? (
                            <TableHead className='sticky left-0 z-10 min-w-44 bg-background'>
                                Học sinh
                            </TableHead>
                        ) : null}
                        {grid.columns.map((column) => (
                            <TableHead
                                key={column.assessmentId}
                                className='min-w-28 text-center whitespace-nowrap'
                            >
                                <div className='font-medium'>
                                    {columnHeaderLabel(column)}
                                </div>
                            </TableHead>
                        ))}
                        <TableHead className='min-w-20 text-center'>
                            ĐTB HK
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {grid.rows.map((row) => {
                        const average = computeRowAverage(
                            row,
                            grid.columns,
                            draft,
                        );

                        return (
                            <TableRow key={row.studentId}>
                                {!hideStudentColumn ? (
                                    <TableCell className='sticky left-0 z-10 bg-background font-medium'>
                                        {row.studentFullName}
                                    </TableCell>
                                ) : null}
                                {grid.columns.map((column) => {
                                    const current = draft[
                                        draftKey(
                                            column.assessmentId,
                                            row.studentId,
                                        )
                                    ] ?? {
                                        score: '',
                                        note: '',
                                    };
                                    const trimmed = current.score.trim();
                                    const parsedScore =
                                        trimmed !== '' &&
                                        isValidScoreInput(
                                            trimmed,
                                            column.maxScore,
                                        )
                                            ? Number.parseFloat(trimmed)
                                            : null;
                                    const absent = isAbsentScoreCell(
                                        parsedScore,
                                        current.note.trim()
                                            ? current.note.trim()
                                            : null,
                                        column.type,
                                    );
                                    const scoreInvalid =
                                        !readonly &&
                                        trimmed !== '' &&
                                        !isValidScoreInput(
                                            trimmed,
                                            column.maxScore,
                                        );

                                    if (readonly) {
                                        return (
                                            <TableCell
                                                key={column.assessmentId}
                                                className='text-center'
                                            >
                                                {absent ? (
                                                    <span className='inline-flex rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700'>
                                                        Vắng
                                                    </span>
                                                ) : parsedScore != null ? (
                                                    String(parsedScore)
                                                ) : (
                                                    <span className='text-muted-foreground'>
                                                        —
                                                    </span>
                                                )}
                                            </TableCell>
                                        );
                                    }

                                    return (
                                        <TableCell
                                            key={column.assessmentId}
                                            className='text-center'
                                        >
                                            <Input
                                                type='number'
                                                min={0}
                                                max={column.maxScore}
                                                step={SCORE_STEP}
                                                className={cn(
                                                    'mx-auto h-8 w-20 text-center',
                                                    scoreInvalid &&
                                                        'border-destructive',
                                                )}
                                                value={current.score}
                                                placeholder='—'
                                                title='Nhập số nguyên hoặc .25, .5, .75'
                                                onChange={(event) =>
                                                    onDraftChange(
                                                        column.assessmentId,
                                                        row.studentId,
                                                        {
                                                            score: event.target
                                                                .value,
                                                        },
                                                    )
                                                }
                                            />
                                        </TableCell>
                                    );
                                })}
                                <TableCell className='text-center font-medium tabular-nums'>
                                    {average != null ? average.toFixed(2) : '—'}
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
