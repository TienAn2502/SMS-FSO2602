import type { AssessmentType } from '@/features/gradebook/api/gradebook-api';

export function isAbsentScoreCell(
  score: number | null,
  note: string | null,
  type: AssessmentType,
): boolean {
  if (score != null) {
    return false;
  }

  if (type !== 'MIDTERM' && type !== 'FINAL') {
    return false;
  }

  return Boolean(note?.trim());
}

export function computeSemesterAverage(
  inputs: Array<{ type: AssessmentType; score: number | null }>,
): number | null {
  let weightedSum = 0;
  let weightTotal = 0;

  for (const input of inputs) {
    if (input.score == null) {
      continue;
    }

    const weight =
      input.type === 'MIDTERM' ? 2 : input.type === 'FINAL' ? 3 : 1;

    weightedSum += input.score * weight;
    weightTotal += weight;
  }

  if (weightTotal === 0) {
    return null;
  }

  return Math.round((weightedSum / weightTotal) * 100) / 100;
}
