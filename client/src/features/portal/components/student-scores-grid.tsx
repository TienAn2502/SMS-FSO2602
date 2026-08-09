import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    PASS_FAIL_RESULT_LABELS,
} from '@/lib/labels';
import type { PortalStudentScoresGrid } from '@/features/portal/api/portal-api';

function renderScoreCell(
    cell: PortalStudentScoresGrid['rows'][number]['cells'][string],
) {
    if (!cell) {
        return <span className='text-muted-foreground'>—</span>;
    }

    if (cell.absent) {
        return (
            <span className='inline-flex rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700'>
                Vắng
            </span>
        );
    }

    if (cell.score != null) {
        return String(cell.score);
    }

    return <span className='text-muted-foreground'>—</span>;
}

export interface FinalizedSubjectResult {
    evaluationMode: string;
    semesterAverage: number | null;
    passFailResult: string | null;
}

function renderSubjectAverage(
    row: PortalStudentScoresGrid['rows'][number],
    finalizedSubjectResults?: Record<string, FinalizedSubjectResult>,
) {
    const finalized = finalizedSubjectResults?.[row.courseSectionId];

    if (finalized) {
        if (finalized.evaluationMode === 'PASS_FAIL') {
            const label = finalized.passFailResult
                ? PASS_FAIL_RESULT_LABELS[
                      finalized.passFailResult as keyof typeof PASS_FAIL_RESULT_LABELS
                  ]
                : null;
            return label ?? '—';
        }

        return finalized.semesterAverage != null
            ? finalized.semesterAverage.toFixed(2)
            : '—';
    }

    return row.semesterAverage != null
        ? row.semesterAverage.toFixed(2)
        : '—';
}

interface StudentScoresGridProps {
    grid: PortalStudentScoresGrid;
    finalizedSubjectResults?: Record<string, FinalizedSubjectResult>;
    averageColumnLabel?: string;
}

export function StudentScoresGrid({
    grid,
    finalizedSubjectResults,
    averageColumnLabel = 'ĐTB HK',
}: StudentScoresGridProps) {
    if (grid.rows.length === 0) {
        return (
            <p className='text-sm text-muted-foreground'>
                Chưa có môn học hoặc điểm trong học kỳ này.
            </p>
        );
    }

    return (
        <div className='overflow-x-auto rounded-md border'>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className='sticky left-0 z-10 min-w-44 bg-background'>
                            Môn học
                        </TableHead>
                        {grid.columns.map((column) => (
                            <TableHead
                                key={column.slotKey}
                                className='min-w-28 text-center whitespace-nowrap'
                            >
                                {column.label}
                            </TableHead>
                        ))}
                        <TableHead className='min-w-20 text-center'>
                            {averageColumnLabel}
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {grid.rows.map((row) => (
                        <TableRow key={row.courseSectionId}>
                            <TableCell className='sticky left-0 z-10 bg-background font-medium'>
                                {row.subjectName ?? row.subjectCode ?? '—'}
                            </TableCell>
                            {grid.columns.map((column) => (
                                <TableCell
                                    key={column.slotKey}
                                    className='text-center'
                                >
                                    {renderScoreCell(row.cells[column.slotKey])}
                                </TableCell>
                            ))}
                            <TableCell className='text-center font-medium tabular-nums'>
                                {renderSubjectAverage(
                                    row,
                                    finalizedSubjectResults,
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
