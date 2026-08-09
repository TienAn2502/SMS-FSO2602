export const SCORE_STEP = 0.25;

export function isValidScoreStep(score: number): boolean {
  if (!Number.isFinite(score)) {
    return false;
  }

  const quarters = score * 4;
  return Math.abs(quarters - Math.round(quarters)) < 1e-6;
}

export function parseScoreInput(value: string): number | null | undefined {
  const trimmed = value.trim();
  if (trimmed === '') {
    return null;
  }

  const parsed = Number.parseFloat(trimmed);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return parsed;
}

export function isValidScoreInput(value: string, maxScore: number): boolean {
  const parsed = parseScoreInput(value);
  if (parsed === undefined) {
    return false;
  }
  if (parsed === null) {
    return true;
  }
  if (parsed < 0 || parsed > maxScore) {
    return false;
  }

  return isValidScoreStep(parsed);
}
