/**
 * Suy ra mã khối từ mã lớp: 10A1 → 10 (khớp mã khối dài nhất hợp lệ của trường).
 * Không khớp nhầm "1" với "10A1".
 */
export function resolveGradeLevelCodeFromClassCode(
  classCode: string,
  schoolGradeLevelCodes: readonly string[],
): string | null {
  const trimmed = classCode.trim();
  if (!trimmed) {
    return null;
  }

  const sorted = [...schoolGradeLevelCodes]
    .map((code) => code.trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  for (const gradeCode of sorted) {
    if (trimmed === gradeCode) {
      return gradeCode;
    }

    if (trimmed.startsWith(gradeCode)) {
      const next = trimmed.charAt(gradeCode.length);
      if (next === '' || !/\d/.test(next)) {
        return gradeCode;
      }
    }
  }

  return null;
}
