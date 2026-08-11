import { parseGradeLevelOrder } from '@/common/utils/grade-level.util';

/** Tìm mã khối liền sau (theo thứ tự số). */
export function findNextGradeLevelCode(
  currentCode: string,
  schoolGradeLevelCodes: readonly string[],
): string | null {
  const currentOrder = parseGradeLevelOrder(currentCode);
  if (currentOrder == null) {
    return null;
  }

  const next = schoolGradeLevelCodes
    .map((code) => ({ code, order: parseGradeLevelOrder(code) }))
    .filter(
      (row): row is { code: string; order: number } => row.order != null,
    )
    .filter((row) => row.order > currentOrder)
    .sort((a, b) => a.order - b.order)[0];

  return next?.code ?? null;
}

/**
 * Đổi mã lớp theo khối: 10A1 + (10→11) → 11A1.
 * Nếu mã không bắt đầu bằng mã khối nguồn, thay cụm số đầu.
 */
export function buildPromotedHomeroomClassCode(
  classCode: string,
  fromGradeCode: string,
  toGradeCode: string,
): string {
  if (classCode.startsWith(fromGradeCode)) {
    return `${toGradeCode}${classCode.slice(fromGradeCode.length)}`;
  }

  return classCode.replace(/^\d+/, toGradeCode);
}
