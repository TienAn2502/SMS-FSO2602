function parseGradeLevelOrder(code: string): number | null {
  const trimmed = code.trim();
  const numeric = Number(trimmed);

  if (Number.isFinite(numeric) && trimmed !== '') {
    return numeric;
  }

  return null;
}

/** Khối cuối cùng của trường (vd. 5 — TH, 9 — THCS, 12 — THPT). */
export function isGraduatingGradeLevel(
  gradeLevelCode: string,
  schoolGradeLevelCodes: readonly string[],
): boolean {
  const currentOrder = parseGradeLevelOrder(gradeLevelCode);
  if (currentOrder == null) {
    return false;
  }

  const orders = schoolGradeLevelCodes
    .map(parseGradeLevelOrder)
    .filter((order): order is number => order != null);

  if (orders.length === 0) {
    return false;
  }

  return currentOrder === Math.max(...orders);
}
