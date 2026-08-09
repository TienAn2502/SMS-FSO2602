import type { ScoreSummary } from '@/features/gradebook/api/gradebook-api';
import { Input } from '@/components/ui/input';
import { SCORE_STEP, isValidScoreInput } from '@/lib/score-step';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export type ScoreDraft = Record<
  string,
  { score: string; note: string }
>;

export function buildScoreDraft(scores: ScoreSummary[]): ScoreDraft {
  return Object.fromEntries(
    scores.map((row) => [
      row.studentId,
      {
        score: row.score != null ? String(row.score) : '',
        note: row.note ?? '',
      },
    ]),
  );
}

export function scoresToBulkPayload(draft: ScoreDraft, maxScore: number) {
  return Object.entries(draft).map(([studentId, value]) => {
    const trimmed = value.score.trim();
    if (trimmed === '') {
      return {
        studentId,
        score: null,
        note: value.note.trim() ? value.note.trim() : null,
      };
    }

    if (!isValidScoreInput(trimmed, maxScore)) {
      throw new Error('INVALID_SCORE_INPUT');
    }

    return {
      studentId,
      score: Number.parseFloat(trimmed),
      note: value.note.trim() ? value.note.trim() : null,
    };
  });
}

export function findInvalidScoreDraftEntries(
  draft: ScoreDraft,
  maxScore: number,
): string[] {
  return Object.entries(draft)
    .filter(([, value]) => !isValidScoreInput(value.score, maxScore))
    .map(([, value]) => value.score.trim())
    .filter(Boolean);
}

interface ScoreRecordGridProps {
  scores: ScoreSummary[];
  draft: ScoreDraft;
  maxScore: number;
  readonly?: boolean;
  emptyHint?: string;
  onDraftChange: (
    studentId: string,
    patch: Partial<{ score: string; note: string }>,
  ) => void;
}

export function ScoreRecordGrid({
  scores,
  draft,
  maxScore,
  readonly = false,
  emptyHint = 'Chưa có học sinh trong đầu điểm.',
  onDraftChange,
}: ScoreRecordGridProps) {
  if (scores.length === 0) {
    return <p className='text-sm text-muted-foreground'>{emptyHint}</p>;
  }

  return (
    <div className='rounded-md border'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Học sinh</TableHead>
            <TableHead className='w-32'>Điểm (/{maxScore})</TableHead>
            <TableHead>Ghi chú</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {scores.map((row) => {
            const current = draft[row.studentId] ?? { score: '', note: '' };
            const scoreInvalid =
              !readonly &&
              current.score.trim() !== '' &&
              !isValidScoreInput(current.score, maxScore);

            return (
              <TableRow key={row.id}>
                <TableCell>{row.studentFullName}</TableCell>
                <TableCell>
                  {readonly ? (
                    row.score != null ? (
                      String(row.score)
                    ) : (
                      <span className='text-muted-foreground'>—</span>
                    )
                  ) : (
                    <Input
                      type='number'
                      min={0}
                      max={maxScore}
                      step={SCORE_STEP}
                      className={cn(
                        'h-8 w-24',
                        scoreInvalid && 'border-destructive',
                      )}
                      value={current.score}
                      placeholder='—'
                      title='Nhập số nguyên hoặc .25, .5, .75'
                      onChange={(event) =>
                        onDraftChange(row.studentId, {
                          score: event.target.value,
                        })
                      }
                    />
                  )}
                </TableCell>
                <TableCell>
                  {readonly ? (
                    row.note ?? '—'
                  ) : (
                    <Input
                      className='h-8'
                      value={current.note}
                      placeholder='Ghi chú'
                      onChange={(event) =>
                        onDraftChange(row.studentId, {
                          note: event.target.value,
                        })
                      }
                    />
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
