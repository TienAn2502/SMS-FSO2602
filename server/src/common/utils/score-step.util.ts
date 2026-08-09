export const SCORE_STEP = 0.25;

export function isValidScoreStep(score: number): boolean {
  if (!Number.isFinite(score)) {
    return false;
  }

  const quarters = score * 4;
  return Math.abs(quarters - Math.round(quarters)) < 1e-6;
}
